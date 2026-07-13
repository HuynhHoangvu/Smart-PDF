import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@napi-rs/canvas",
    "puppeteer",
    "puppeteer-core",
    "@sparticuz/chromium",
    "docx",
    "mammoth",
    "sharp",
  ],
};

export default nextConfig;
