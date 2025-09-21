
const express = require('express');
const router = express.Router();
const controller = require('../controllers/LocationController');
const auth = require('../middleware/auth');
// Import Express's built-in JSON body parser. This middleware is necessary to
// parse the JSON payload sent in the body of POST and PUT requests.
const jsonParser = require('express').json();

// Base path for all routes in this file: /api/locations

/**
 * @route   POST /api/locations
 * @desc    Create a new location.
 * @access  Private - Requires authentication.
 *
 * Middleware chain:
 * 1. `auth`: Verifies the user's JWT.
 * 2. `jsonParser`: Parses the incoming request body as JSON.
 * 3. `controller.create`: The final handler that creates the location.
 */
router.post('/', auth, jsonParser, controller.create);

/**
 * @route   GET /api/locations
 * @desc    Get a list of all locations.
 * @access  Private
 */
router.get('/', auth, controller.list);

/**
 * @route   GET /api/locations/:token
 * @desc    Get a single location by its unique token.
 * @access  Private
 */
router.get('/:token', auth, controller.getOne);

/**
 * @route   PUT /api/locations/:token
 * @desc    Update an existing location.
 * @access  Private
 */
router.put('/:token', auth, jsonParser, controller.update);

/**
 * @route   DELETE /api/locations/:token
 * @desc    Delete a location.
 * @access  Private
 */
router.delete('/:token', auth, controller.remove);

module.exports = router;