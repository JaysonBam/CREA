const { z } = require('zod');

// Define the allowed categories as a Zod enum
const categoryEnum = z.enum(
  ['POTHOLE', 'WATER_LEAK', 'POWER_OUTAGE', 'STREETLIGHT_FAILURE', 'OTHER'], {
    errorMap: () => ({ message: 'Please select a valid category.' })
  }
);

// Regex to allow alphanumeric characters and common punctuation.
// This helps prevent basic injection attempts.
const safeTextRegex = /^[a-zA-Z0-9\s.,'!?()-]*$/;

// Define the main schema
const issueReportSchema = z.object({
  title: z.string({
      required_error: 'Title is a required field.',
    })
    .min(5, { message: 'Title must be at least 5 characters long.' })
    .max(100, { message: 'Title cannot be longer than 100 characters.' })
    .regex(safeTextRegex, { message: 'Title contains invalid characters.' }),

  description: z.string({
      required_error: 'Description is a required field.',
    })
    .min(10, { message: 'Description must be at least 10 characters long.' })
    .max(1000, { message: 'Description cannot be longer than 1000 characters.' })
    .regex(safeTextRegex, { message: 'Description contains invalid characters.' }),
  
  category: categoryEnum,
  
  location_id: z.number({
    required_error: 'A location must be selected on the map.',
    invalid_type_error: 'Location ID must be a number.'
  }).int().positive(),
});

module.exports = issueReportSchema;