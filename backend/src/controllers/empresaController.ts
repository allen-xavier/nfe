import { Request, Response } from "express";
import { createEmpresa } from "../services/empresaService";

export const criarEmpresa = async (req: Request, res: Response) => {
  try {
    const empresa = await createEmpresa(req.body);
    return res.status(201).json({
      id: empresa.id,
      token: empresa.token_empresa,
      message: "Empresa criada e token gerado automaticamente.",
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar empresa." });
  }
};
