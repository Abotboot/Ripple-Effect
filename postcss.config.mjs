import { fileURLToPath } from "node:url";

// Plugins are named by string (Next.js loads them itself); the local one needs
// an absolute path, since the build resolves it from its own output folder.
const config = {
  plugins: [
    "@tailwindcss/postcss",
    fileURLToPath(new URL("./postcss-motion-choice.cjs", import.meta.url)),
  ],
};

export default config;
