const express = require('express');
const router = express.Router();
const controller = require('../controllers/LocationController');
const auth = require('../middleware/auth');
const jsonParser = require('express').json();

// Base path: /api/locations

/**
 * @route   POST /api/locations
 * @desc    Create a new location.
 * @access  Private
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
 * @desc    Get a single location by its token.
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