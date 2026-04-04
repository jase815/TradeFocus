const express = require("express");
const router = express.Router();
const Preset = require("../models/preset");
const auth = require("../middleware/auth");

// GET all presets for logged-in user
router.get("/", auth, async (req, res) => {
  try {
    const presets = await Preset.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(presets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ADD preset
router.post("/", auth, async (req, res) => {
  try {
    const { name, symbol, direction, contracts, manualPnl, notes } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Preset name is required" });
    }

    const existingPreset = await Preset.findOne({
      userId: req.user.id,
      name,
    });

    if (existingPreset) {
      existingPreset.symbol = symbol;
      existingPreset.direction = direction;
      existingPreset.contracts = contracts;
      existingPreset.manualPnl = manualPnl;
      existingPreset.notes = notes;

      const updatedPreset = await existingPreset.save();
      return res.json(updatedPreset);
    }

    const preset = new Preset({
      userId: req.user.id,
      name,
      symbol,
      direction,
      contracts,
      manualPnl,
      notes,
    });

    const savedPreset = await preset.save();
    res.status(201).json(savedPreset);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE preset
router.delete("/:id", auth, async (req, res) => {
  try {
    const deletedPreset = await Preset.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deletedPreset) {
      return res.status(404).json({ message: "Preset not found" });
    }

    res.json({ message: "Preset deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;