const express = require("express");
const auth = require("../middleware/auth");
const requirePro = require("../middleware/requirePro");
const Folder = require("../models/folder");
const Trade = require("../models/trade");

const router = express.Router();

router.get("/", auth, requirePro, async (req, res) => {
  try {
    const folders = await Folder.find({ userId: req.user.id }).sort({
      createdAt: -1,
      updatedAt: -1,
    });

    return res.json(folders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/", auth, requirePro, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const notes = String(req.body.notes || "").trim();

    if (!name) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    const folder = await Folder.create({
      userId: req.user.id,
      name,
      notes,
    });

    return res.status(201).json(folder);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.put("/:id", auth, requirePro, async (req, res) => {
  try {
    const updates = {};

    if (req.body.name !== undefined) {
      const name = String(req.body.name || "").trim();
      if (!name) {
        return res.status(400).json({ message: "Folder name is required" });
      }
      updates.name = name;
    }

    if (req.body.notes !== undefined) {
      updates.notes = String(req.body.notes || "");
    }

    const folder = await Folder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updates,
      { new: true }
    );

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    return res.json(folder);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", auth, requirePro, async (req, res) => {
  try {
    const folder = await Folder.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    await Trade.updateMany(
      { userId: req.user.id, folderId: String(req.params.id) },
      { $set: { folderId: "" } }
    );

    return res.json({ message: "Folder deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
