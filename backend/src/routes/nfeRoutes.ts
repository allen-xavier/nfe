import { Router } from "express";
import { emitirNotaController, downloadPdfController } from "../controllers/nfeController";

const router = Router();

router.post("/emitir", emitirNotaController);
router.get("/:id/pdf", downloadPdfController);

export default router;
