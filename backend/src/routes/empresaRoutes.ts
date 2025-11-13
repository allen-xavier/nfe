import { Router } from "express";
import { criarEmpresa } from "../controllers/empresaController";

const router = Router();

router.post("/", criarEmpresa);

export default router;
