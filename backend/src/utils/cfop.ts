export const resolveCfop = (empresaUf: string, destinatarioUf: string): string =>
  empresaUf.toUpperCase() === destinatarioUf.toUpperCase() ? "5102" : "6102";
