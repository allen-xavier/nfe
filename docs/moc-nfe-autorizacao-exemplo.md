# Exemplo de Payload SOAP para `NFeAutorizacaoLote` (MOC v7.0)

Com base no *Manual de Orientação ao Contribuinte (MOC) v7.0*, a SEFAZ espera que cada lote de NF-e enviado ao serviço `NfeAutorizacao` esteja estruturado exatamente como abaixo:

1. Um `Envelope` SOAP 1.2 com cabeçalho `nfeCabecMsg` (cUF + versão).
2. O corpo contém `<nfe:NFeAutorizacaoLote>` com o namespace `http://www.portalfiscal.inf.br/nfe/wsdl/NfeAutorizacao`.
3. Dentro deste bloco temos o XML do lote (`<nfe:enviNFe>`) e a tag `<nfe:nfeDadosMsg>` com o mesmo XML assinado.

O XML de exemplo abaixo segue o **schema `enviNFe_v4.00.xsd`** (capítulo 5.1 do manual) e mostra um único documento NF-e (`<NFe>` com `<infNFe>`). Os campos `idLote`, `indSinc`, assinatura, `infNFe` e o `nfeCabecMsg` estão alinhados com as orientações do manual (tabelas de leiautes, assinatura envelopada, namespaces sem prefixo, codificação UTF-8, etc.).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NfeAutorizacao">
  <soapenv:Header>
    <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NfeAutorizacao">
      <cUF>31</cUF>
      <versaoDados>4.00</versaoDados>
    </nfeCabecMsg>
  </soapenv:Header>
  <soapenv:Body>
    <nfe:NFeAutorizacaoLote>
      <nfe:nfeDadosMsg>
        <enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
          <idLote>000000001</idLote>
          <indSinc>0</indSinc>
          <NFe>
            <infNFe Id="NFe31062012345678000123550010000000011312345678" versao="4.00">
              <ide>
                <cUF>31</cUF>
                <cNF>12345678</cNF>
                <natOp>VENDA MERCADORIA</natOp>
                <mod>55</mod>
                <serie>1</serie>
                <nNF>11</nNF>
                <dhEmi>2025-06-20T10:00:00-03:00</dhEmi>
                <dhSaiEnt>2025-06-20T10:00:00-03:00</dhSaiEnt>
                <tpNF>1</tpNF>
                <idDest>1</idDest>
                <cMunFG>3106200</cMunFG>
                <tpImp>1</tpImp>
                <tpEmis>1</tpEmis>
                <cDV>5</cDV>
                <tpAmb>2</tpAmb>
                <finNFe>1</finNFe>
                <indFinal>0</indFinal>
                <indPres>1</indPres>
                <procEmi>0</procEmi>
                <verProc>exemplo-v1</verProc>
              </ide>
              <emit>
                <CNPJ>12345678000123</CNPJ>
                <xNome>Empresa Exemplo LTDA</xNome>
                <IE>123456789</IE>
                <CRT>1</CRT>
                <enderEmit>
                  <xLgr>Rua Exemplo</xLgr>
                  <nro>100</nro>
                  <xBairro>Centro</xBairro>
                  <xMun>Belo Horizonte</xMun>
                  <UF>MG</UF>
                  <CEP>30140071</CEP>
                  <cMun>3106200</cMun>
                  <cPais>1058</cPais>
                  <xPais>BRASIL</xPais>
                </enderEmit>
              </emit>
              <dest>
                <CPF>04966941021</CPF>
                <xNome>Cliente Teste</xNome>
                <enderDest>
                  <xLgr>Av. Cliente</xLgr>
                  <nro>200</nro>
                  <xBairro>Savassi</xBairro>
                  <xMun>Belo Horizonte</xMun>
                  <UF>MG</UF>
                  <CEP>30140071</CEP>
                  <cMun>3106200</cMun>
                  <cPais>1058</cPais>
                  <xPais>BRASIL</xPais>
                </enderDest>
              </dest>
              <det nItem="1">
                <prod>
                  <xProd>Produto Teste</xProd>
                  <NCM>12345678</NCM>
                  <CFOP>5102</CFOP>
                  <uCom>un</uCom>
                  <qCom>1.00</qCom>
                  <vUnCom>1.01</vUnCom>
                  <vProd>1.01</vProd>
                </prod>
                <imposto>
                  <ICMS>
                    <ICMS00>
                      <orig>0</orig>
                      <CST>00</CST>
                      <modBC>0</modBC>
                      <vBC>0.00</vBC>
                      <pICMS>0.00</pICMS>
                      <vICMS>0.00</vICMS>
                    </ICMS00>
                  </ICMS>
                </imposto>
              </det>
              <total>
                <ICMSTot>
                  <vBC>0.00</vBC>
                  <vICMS>0.00</vICMS>
                  <vProd>1.01</vProd>
                  <vNF>1.01</vNF>
                </ICMSTot>
              </total>
            </infNFe>
            <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
              <!-- assinatura envelopada sobre <infNFe> -->
            </Signature>
          </NFe>
        </enviNFe>
      </nfe:nfeDadosMsg>
    </nfe:NFeAutorizacaoLote>
  </soapenv:Body>
</soapenv:Envelope>
```

### Observações

- `nfeDadosMsg` deve conter exatamente o mesmo XML de `<enviNFe>`; duplicidade visível no `nfeAutorizacaoLote` ajuda o parser a extrair o lote para validação.
- O `Signature` dentro de `<NFe>` precisa ser calculado usando `infNFe` completo, com Id `"NFe" + chave de acesso`, conforme o manual (capítulo 4.2.4).
- `cUF`, `versaoDados`, `tpAmb`, `mod`, `serie`, `nNF`, `tpEmis` etc. devem obedecer aos campos no XML e na chave de acesso (capítulo 2.2.6).
- Os caminhos SOAP (`SOAPAction`, `Content-Type`, cabeçalho TLS com certificado ICP-Brasil) são mencionados no manual (seções 4 e 5) e já estão implementados em `sefazService.ts`.

Use este exemplo para comparar lado a lado com o XML que sua aplicação está enviando. Se o SEFAZ continuar devolvendo 415, copie o conteúdo logado no `catch` e verifique se:

1. O `<enviNFe>` está completo, com `idLote`, `indSinc`, `<NFe>` e `<Signature>`.
2. O namespace principal do `<NFe>` é `http://www.portalfiscal.inf.br/nfe` sem prefixos extras.
3. O SOAPAction e o endpoint usados batem com o que a SEFAZ da sua UF exige (no seu caso, `https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4`).

Com isso você tem uma referência oficial do MOC para orientar ajustes e confirmar se o payload que sai da aplicação segue o fluxo esperado.
