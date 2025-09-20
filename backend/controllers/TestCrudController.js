const { TestCrud } = require("../models");
const { testCrudSchema } = require("../schemas/TestCrudSchema");
function zodIssuesToBag(issues = []) {
  const bag = {};
  for (const i of issues) {
    const field = String(i.path?.[0] ?? "");
    const key = field || "_";
    if (!bag[key]) bag[key] = i.message;
  }
  return bag;
}

async function findByTokenOr404(token, res) {
  // Helper to find a record by token or return a 404 response
  const row = await TestCrud.findOne({ where: { token } });
  if (!row) {
    res.status(404).json({
      success: false,
      message: "Record not found",
    });
    return null;
  }
  return row;
}

exports.list = async (_req, res) => {
  try {
    // List all records, ordered by ID ascending
    const rows = await TestCrud.findAll({ order: [["id", "ASC"]] });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    // Get one record by token
    const row = await findByTokenOr404(req.params.token, res);
    if (!row) return;
    res.json({ success: true, message: "Loaded", data: row });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    // Validate input using the Zod schema to make sure all data is passed correctly
    const parsed = testCrudSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: zodIssuesToBag(parsed.error.issues),
      });
    }

    const { title, description = "", isActive } = parsed.data;
    // Create the record
    const created = await TestCrud.create({ title, description, isActive });

    // Return a success response with the created record
    return res.status(201).json({
      success: true,
      message: "Item created successfully",
      data: created,
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    // Find the record to update
    const row = await findByTokenOr404(req.params.token, res);
    if (!row) return;

    const parsed = testCrudSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: zodIssuesToBag(parsed.error.issues),
      });
    }

    const { title, description = "", isActive } = parsed.data;
    // Update the record
    await row.update({ title, description, isActive });

    return res.json({
      success: true,
      message: "Item updated successfully",
      data: row,
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    // Find the record to delete
    const row = await findByTokenOr404(req.params.token, res);
    if (!row) return;
    // Delete the record
    await row.destroy();
    return res.status(200).json({
      success: true,
      message: "Item deleted successfully",
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
