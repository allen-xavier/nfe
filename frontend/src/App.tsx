import React from "react";
import EmpresaForm from "./components/EmpresaForm";
import NotaForm from "./components/NotaForm";

const App: React.FC = () => {
  return (
    <div className="app-wrapper">
      <h1>Emissão de NF-e (Modelo 55 - MG)</h1>
      <section>
        <h2>Cadastro de Empresa</h2>
        <p>Para empresas do Simples Nacional CSOSN 102. Insira certificados e gere token.</p>
        <EmpresaForm />
      </section>
      <section style={{ marginTop: "2rem" }}>
        <h2>Emitir Nota</h2>
        <p>
          Preencha destinatário e itens. O sistema valida CFOP e retorna PDF do DANFE. O XML fica
          armazenado internamente.
        </p>
        <NotaForm />
      </section>
    </div>
  );
};

export default App;
