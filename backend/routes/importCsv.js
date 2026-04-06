const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth");
const requirePro = require("../middleware/requirePro");
const Trade = require("../models/trade");
const ImportBatch = require("../models/importBatch");
const Folder = require("../models/folder");
const { hasPremiumAccess } = require("../utils/premiumAccess");
const {
  SOURCE_OPTIONS,
  buildImportResponse,
  buildTradeDocument,
  classifyTradesForImport,
  normalizeSource,
  parseImportFile,
} = require("../utils/propFirmImport");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const hasCsvMimeType =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "text/plain";
    const hasCsvExtension = /\.csv$/i.test(file.originalname || "");

    if (!hasCsvMimeType && !hasCsvExtension) {
      return cb(new Error("Only CSV files are supported right now"));
    }

    return cb(null, true);
  },
});

async function buildPreviewPayload({ userId, file, source }) {
  const parsed = parseImportFile(file.buffer, source, file.originalname || "");
  const existingTrades = await Trade.find({ userId }).select(
    "symbol direction contracts entry exit tradeDate manualPnl profit externalTradeId importFingerprint entryTime exitTime"
  );
  const classified = classifyTradesForImport({
    userId,
    parsedTrades: parsed.parsedTrades,
    existingTrades,
  });

  return { parsed, classified };
}

router.get("/access", auth, async (req, res) => {
  try {
    const isPremium = await hasPremiumAccess(req.user.id);

    return res.json({
      isPremium,
      availableSources: SOURCE_OPTIONS,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/preview", auth, requirePro, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const source = normalizeSource(req.body.source);
    const isPremium = await hasPremiumAccess(req.user.id);
    const { parsed, classified } = await buildPreviewPayload({
      userId: req.user.id,
      file: req.file,
      source,
    });

    return res.json(
      buildImportResponse({
        source,
        fileName: req.file.originalname || "",
        isPremium,
        parsed,
        classified,
      })
    );
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message:
        statusCode === 400
          ? error.message
          : "We could not preview that CSV right now.",
    });
  }
});

router.post("/confirm", auth, requirePro, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const isPremium = await hasPremiumAccess(req.user.id);

    const source = normalizeSource(req.body.source);
    const folderId = String(req.body.folderId || "").trim();

    if (folderId) {
      const folder = await Folder.findOne({ _id: folderId, userId: req.user.id });
      if (!folder) {
        return res.status(404).json({ message: "Folder not found" });
      }
    }

    const { parsed, classified } = await buildPreviewPayload({
      userId: req.user.id,
      file: req.file,
      source,
    });

    const batch = await ImportBatch.create({
      userId: req.user.id,
      source,
      filename: req.file.originalname || "",
      totalRows: parsed.totalRows,
      validTrades: parsed.parsedTrades.length,
      duplicateCount: classified.duplicateRows.length,
      skippedCount: parsed.skippedRows.length,
      importedCount: classified.readyTrades.length,
      notes: String(req.body.importNotes || ""),
    });

    if (classified.readyTrades.length > 0) {
      const docs = classified.readyTrades.map((trade) =>
        buildTradeDocument(req.user.id, String(batch._id), trade, folderId)
      );
      await Trade.insertMany(docs);
    }

    return res.json({
      message:
        classified.readyTrades.length > 0
          ? `Imported ${classified.readyTrades.length} trades`
          : "No new trades were imported because everything matched an existing trade or was skipped.",
      ...buildImportResponse({
        source,
        fileName: req.file.originalname || "",
        isPremium,
        parsed,
        classified,
        importedCount: classified.readyTrades.length,
        importBatchId: String(batch._id),
      }),
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message:
        statusCode === 400
          ? error.message
          : "We could not import that CSV right now.",
    });
  }
});

router.post("/csv", auth, requirePro, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const isPremium = await hasPremiumAccess(req.user.id);

    const source = normalizeSource(req.body.source);
    const folderId = String(req.body.folderId || "").trim();

    if (folderId) {
      const folder = await Folder.findOne({ _id: folderId, userId: req.user.id });
      if (!folder) {
        return res.status(404).json({ message: "Folder not found" });
      }
    }

    const { parsed, classified } = await buildPreviewPayload({
      userId: req.user.id,
      file: req.file,
      source,
    });

    if (classified.readyTrades.length > 0) {
      const batch = await ImportBatch.create({
        userId: req.user.id,
        source,
        filename: req.file.originalname || "",
        totalRows: parsed.totalRows,
        validTrades: parsed.parsedTrades.length,
        duplicateCount: classified.duplicateRows.length,
        skippedCount: parsed.skippedRows.length,
        importedCount: classified.readyTrades.length,
        notes: String(req.body.importNotes || ""),
      });

      const docs = classified.readyTrades.map((trade) =>
        buildTradeDocument(req.user.id, String(batch._id), trade, folderId)
      );
      await Trade.insertMany(docs);

      return res.json({
        message: `Imported ${classified.readyTrades.length} trades`,
        ...buildImportResponse({
          source,
          fileName: req.file.originalname || "",
          isPremium,
          parsed,
          classified,
          importedCount: classified.readyTrades.length,
          importBatchId: String(batch._id),
        }),
      });
    }

    return res.json({
      message: "No new trades were imported because everything matched an existing trade or was skipped.",
      ...buildImportResponse({
        source,
        fileName: req.file.originalname || "",
        isPremium,
        parsed,
        classified,
        importedCount: 0,
      }),
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message:
        statusCode === 400
          ? error.message
          : "We could not import that CSV right now.",
    });
  }
});

module.exports = router;
