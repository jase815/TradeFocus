const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth");
const Trade = require("../models/trade");
const User = require("../models/user");
const ImportBatch = require("../models/importBatch");
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

async function getPremiumAccess(userId) {
  return true; // TEMP: allow all users for testing
}

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
    const isPremium = await getPremiumAccess(req.user.id);

    return res.json({
      isPremium,
      availableSources: SOURCE_OPTIONS,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/preview", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const source = normalizeSource(req.body.source);
    const isPremium = await getPremiumAccess(req.user.id);
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

router.post("/confirm", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const isPremium = await getPremiumAccess(req.user.id);
    if (!isPremium) {
      return res.status(403).json({
        message:
          "Preview your import for free. Upgrade to Pro to confirm and import all valid trades.",
      });
    }

    const source = normalizeSource(req.body.source);
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
    });

    if (classified.readyTrades.length > 0) {
      const docs = classified.readyTrades.map((trade) =>
        buildTradeDocument(req.user.id, String(batch._id), trade)
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

router.post("/csv", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const isPremium = await getPremiumAccess(req.user.id);
    if (!isPremium) {
      return res.status(403).json({
        message:
          "Preview your import for free. Upgrade to Pro to confirm and import all valid trades.",
      });
    }

    const source = normalizeSource(req.body.source);
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
      });

      const docs = classified.readyTrades.map((trade) =>
        buildTradeDocument(req.user.id, String(batch._id), trade)
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
