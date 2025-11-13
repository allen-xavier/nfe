import crypto from "crypto";

const SECRET = process.env.APP_SECRET ?? "chave-muito-secreta";
const ALGORITHM = "aes-256-cbc";

export const encrypt = (value: string) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, crypto.scryptSync(SECRET, "salt", 32), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decrypt = (value: string) => {
  const [ivHex, encrypted] = value.split(":");
  if (!ivHex || !encrypted) {
    throw new Error("Certificado inválido");
  }
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    crypto.scryptSync(SECRET, "salt", 32),
    iv
  );
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "hex")), decipher.final()]).toString("utf8");
};
