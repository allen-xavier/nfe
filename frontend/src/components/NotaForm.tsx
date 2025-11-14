import axios from "axios";
import React, { useState } from "react";
import api from "../lib/api";

type Item = {
  descricao: string;
  ncm: string;
  quantidade: number;
  valor_unitario: number;
};

const NotaForm: React.FC = () => {
  const [token, setToken] = useState("");
  const [destinatario, setDestinatario] = useState({
    nome: "",
    cpf: "",
    endereco: "",
    uf: "MG",
    cidade: "",
    cep: "",
    numero: "",
    bairro: "",
  });
  const [itens, setItens] = useState<Item[]>([
    { descricao: "", ncm: "", quantidade: 1, valor_unitario: 0 },
  ]);
  const [pdfUrl, setPdfUrl] = useState<string>();
  const [xmlUrl, setXmlUrl] = useState<string>();
  const [message, setMessage] = useState<string>();

  const updateItem = (index: number, field: keyof Item, value: string | number) => {
    setItens((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: typeof value === "number" ? value : value } : item)));
  };

  const handleAddItem = () => setItens((prev) => [...prev, { descricao: "", ncm: "", quantidade: 1, valor_unitario: 0 }]);

  const handleDestChange = (field: keyof typeof destinatario) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setDestinatario((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(undefined);
    if (!token) {
      setMessage("Informe o token da empresa.");
      return;
    }

    setPdfUrl(undefined);
    setXmlUrl(undefined);
    try {
      const response = await api.post(
        "/nfe/emitir",
        {
          destinatario,
          itens,
          transporte: { modFrete: 9 },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const pdfBase64 = response.data.pdf;
      const xmlContent = response.data.xml;
      const pdfBuffer = Uint8Array.from(atob(pdfBase64), (char) => char.charCodeAt(0));
      const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });
      const newPdfUrl = URL.createObjectURL(pdfBlob);
      setPdfUrl(newPdfUrl);
      if (xmlContent) {
        const xmlBlob = new Blob([xmlContent], { type: "application/xml" });
        const newXmlUrl = URL.createObjectURL(xmlBlob);
        setXmlUrl(newXmlUrl);
      }
      setMessage("NF-e autorizada. PDF e XML disponíveis para download.");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error ?? error.response?.data?.detail ?? error.message;
        setMessage(message);
      } else if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Erro ao emitir nota.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px" }}>
      <label>
        Token da empresa
        <input value={token} onChange={(event) => setToken(event.target.value)} required />
      </label>
      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
        <input placeholder="Destinatário" value={destinatario.nome} onChange={handleDestChange("nome")} required />
        <input placeholder="CPF" value={destinatario.cpf} onChange={handleDestChange("cpf")} required />
        <input placeholder="Endereço" value={destinatario.endereco} onChange={handleDestChange("endereco")} required />
        <select value={destinatario.uf} onChange={handleDestChange("uf")}>
          {["MG", "SP", "RJ", "BR"].map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
        <input placeholder="Cidade" value={destinatario.cidade} onChange={handleDestChange("cidade")} required />
        <input placeholder="CEP" value={destinatario.cep} onChange={handleDestChange("cep")} required />
        <input placeholder="Número" value={destinatario.numero} onChange={handleDestChange("numero")} />
        <input placeholder="Bairro" value={destinatario.bairro} onChange={handleDestChange("bairro")} />
      </div>
      <div>
        <h3>Itens</h3>
        {itens.map((item, index) => (
          <div key={index} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.5rem" }}>
            <input placeholder="Descrição" value={item.descricao} onChange={(event) => updateItem(index, "descricao", event.target.value)} required />
            <input placeholder="NCM" value={item.ncm} onChange={(event) => updateItem(index, "ncm", event.target.value)} required />
            <input
              type="number"
              min={1}
              placeholder="Quantidade"
              value={item.quantidade}
              onChange={(event) => updateItem(index, "quantidade", Number(event.target.value))}
              required
            />
            <input
              type="number"
              min={0.1}
              step="0.01"
              placeholder="Valor unitário"
              value={item.valor_unitario}
              onChange={(event) => updateItem(index, "valor_unitario", Number(event.target.value))}
              required
            />
          </div>
        ))}
        <button type="button" onClick={handleAddItem}>
          Adicionar item
        </button>
      </div>
      <button type="submit" style={{ marginTop: "1rem" }}>
        Emitir NF-e
      </button>
      {message && <p>{message}</p>}
      {pdfUrl && (
        <div>
          <a href={pdfUrl} target="_blank" rel="noreferrer">
            Baixar DANFE
          </a>
        </div>
      )}
      {xmlUrl && (
        <div>
          <a href={xmlUrl} target="_blank" rel="noreferrer">
            Baixar XML da NF-e
          </a>
        </div>
      )}
    </form>
  );
};

export default NotaForm;
