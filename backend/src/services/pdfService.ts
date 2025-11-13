import PDFDocument from "pdfkit";

export const generateDanfe = async (nota: {
  empresa: string;
  destinatario: string;
  cpf: string;
  uf: string;
  total: number;
  chave_acesso: string;
  itens: { descricao: string; quantidade: number; valor_unitario: number; cfop: string }[];
}): Promise<Buffer> =>
  new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(14).text("DANFE - NF-e (Modelo 55)", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`Empresa: ${nota.empresa}`);
    doc.text(`Destinatário: ${nota.destinatario}`);
    doc.text(`CPF: ${nota.cpf}`);
    doc.text(`UF: ${nota.uf}`);
    doc.text(`Chave de Acesso: ${nota.chave_acesso}`);

    doc.moveDown();
    doc.fontSize(12).text("Itens", { underline: true });

    nota.itens.forEach((item, index) => {
      doc
        .fontSize(10)
        .text(
          `${index + 1}. ${item.descricao} | NCM ${item.cfop} | Quantidade: ${item.quantidade} | Valor unitário: R$ ${item.valor_unitario.toFixed(
            2
          )}`
        );
    });

    doc.moveDown();
    doc.fontSize(12).text(`Total: R$ ${nota.total.toFixed(2)}`);
    doc.moveDown();
    doc.fontSize(8).text("Rodapé: sistema integrado com a SEFAZ MG - XML armazenado internamente.");

    doc.end();
  });
