const Umpire = require("../models/Umpire");

// Get all umpires
exports.getUmpires = async (req, res) => {
  try {
    const umpires = await Umpire.find();
    res.status(200).json(umpires);
  } catch (error) {
    res.status(500).json({ message: "Error fetching umpires", error });
  }
};

// Add a new umpire
exports.addUmpire = async (req, res) => {
  try {
    const { name, nationality } = req.body;
    const umpire = new Umpire({ name, nationality });
    await umpire.save();
    res.status(201).json(umpire);
  } catch (error) {
    res.status(400).json({ message: "Error adding umpire", error });
  }
};

// Update an umpire
exports.updateUmpire = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, nationality } = req.body;
    const umpire = await Umpire.findByIdAndUpdate(id, { name, nationality }, { new: true });
    if (!umpire) return res.status(404).json({ message: "Umpire not found" });
    res.status(200).json(umpire);
  } catch (error) {
    res.status(400).json({ message: "Error updating umpire", error });
  }
};

// Delete an umpire
exports.deleteUmpire = async (req, res) => {
  try {
    const { id } = req.params;
    const umpire = await Umpire.findByIdAndDelete(id);
    if (!umpire) return res.status(404).json({ message: "Umpire not found" });
    res.status(200).json({ message: "Umpire deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting umpire", error });
  }
};