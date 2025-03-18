const Venue = require("../models/Venue");

// Get all venues
exports.getVenues = async (req, res) => {
  try {
    const venues = await Venue.find();
    res.status(200).json(venues);
  } catch (error) {
    res.status(500).json({ message: "Error fetching venues", error });
  }
};

// Add a new venue
exports.addVenue = async (req, res) => {
  try {
    const { name, location } = req.body;
    const venue = new Venue({ name, location });
    await venue.save();
    res.status(201).json(venue);
  } catch (error) {
    res.status(400).json({ message: "Error adding venue", error });
  }
};

// Update a venue
exports.updateVenue = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location } = req.body;
    const venue = await Venue.findByIdAndUpdate(id, { name, location }, { new: true });
    if (!venue) return res.status(404).json({ message: "Venue not found" });
    res.status(200).json(venue);
  } catch (error) {
    res.status(400).json({ message: "Error updating venue", error });
  }
};

// Delete a venue
exports.deleteVenue = async (req, res) => {
  try {
    const { id } = req.params;
    const venue = await Venue.findByIdAndDelete(id);
    if (!venue) return res.status(404).json({ message: "Venue not found" });
    res.status(200).json({ message: "Venue deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting venue", error });
  }
};