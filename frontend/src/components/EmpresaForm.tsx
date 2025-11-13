import axios from "axios";
import React, { useState } from "react";

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result.split(",")[1]);
      } else {
        reject(new Error("Erro ao ler certificado"));
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler certificado"));
    reader.readAsDataURL(file);
  });

const EmpresaForm: React.FC = () => {
  const [form, setForm] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    ie: "",
    endereco: "",
    cidade: "",
    uf: "MG",
    cep: "",
    crt: "Simples Nacional",
    certificado_senha: "",
  });
  const [token, setToken] = useState<string>();
  const [certificadoBase64, setCertificadoBase64] = useState<string>();
  const [status, setStatus] = useState<string>();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setCertificadoBase64(undefined);
      return;
    }
    const base64 = await readFileAsBase64(file);
    setCertificadoBase64(base64);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!certificadoBase64) {
      setStatus("Selecione o certificado PFX.");
      return;
    }
    try {
      const payload = {
        ...form,
        certificado_pfx: certificadoBase64,
      };
      const response = await axios.post("/api/empresa", payload);
      setToken(response.data.token);
      setStatus("Empresa criada com sucesso.");
    } catch (error) {
      setStatus("Erro ao cadastrar empresa.");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px" }}>
      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))" }}>
        <input name="razao_social" placeholder="Razão Social" value={form.razao_social} onChange={handleChange} required />
        <input name="nome_fantasia" placeholder="Nome Fantasia" value={form.nome_fantasia} onChange={handleChange} required />
        <input name="cnpj" placeholder="CNPJ" value={form.cnpj} onChange={handleChange} required />
        <input name="ie" placeholder="IE" value={form.ie} onChange={handleChange} required />
        <input name="endereco" placeholder="Endereço completo" value={form.endereco} onChange={handleChange} required />
        <input name="cidade" placeholder="Cidade" value={form.cidade} onChange={handleChange} required />
        <select name="uf" value={form.uf} onChange={handleChange} required>
          {["MG", "SP", "RJ", "BR"].map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
        <input name="cep" placeholder="CEP" value={form.cep} onChange={handleChange} required />
        <input name="crt" placeholder="CRT" value={form.crt} onChange={handleChange} required />
        <input name="certificado_senha" type="password" placeholder="Senha do PFX" value={form.certificado_senha} onChange={handleChange} required />
        <input type="file" accept=".pfx,.p12" onChange={handleFile} required />
      </div>
      <button type="submit" style={{ marginTop: "1rem" }}>
        Validar certificado e gerar token
      </button>
      {status && <p>{status}</p>}
      {token && (
        <div>
          <strong>Token gerado:</strong> <code>{token}</code>
        </div>
      )}
    </form>
  );
};

export default EmpresaForm;
