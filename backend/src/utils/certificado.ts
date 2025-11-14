import forge from "node-forge";

export interface Certificado {
  certPem: string;
  keyPem: string;
}

export const parsePfx = (pfxBuffer: Buffer, senha: string): Certificado => {
  const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString("binary"));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, senha);
  const bags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? [];

  if (!bags.length || !keyBags.length) {
    throw new Error("PFX inválido ou senha incorreta");
  }

  const cert = bags[0].cert;
  const key = keyBags[0].key;

  const certPem = forge.pki.certificateToPem(cert);
  const keyPem = forge.pki.privateKeyToPem(key);

  return { certPem, keyPem };
};
