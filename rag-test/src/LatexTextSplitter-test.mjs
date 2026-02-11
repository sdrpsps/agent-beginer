import { Document } from "@langchain/core/documents";
import { LatexTextSplitter } from "@langchain/textsplitters";
import "cheerio";
import "dotenv/config";
import { getEncoding } from "js-tiktoken";

const latexText = `\int x^{\mu}\mathrm{d}x=\frac{x^{\mu +1}}{\mu +1}+C, \left({\mu \neq -1}\right) \int \frac{1}{\sqrt{1-x^{2}}}\mathrm{d}x= \arcsin x +C \int \frac{1}{\sqrt{1-x^{2}}}\mathrm{d}x= \arcsin x +C \begin{pmatrix}  
  a_{11} & a_{12} & a_{13} \\  
  a_{21} & a_{22} & a_{23} \\  
  a_{31} & a_{32} & a_{33}  
\end{pmatrix} `;

const latexDocument = new Document({
  pageContent: latexText,
});

const latexTextSplitter = new LatexTextSplitter({
  chunkSize: 200,
  chunkOverlap: 40,
});

const splitDocuments = await latexTextSplitter.splitDocuments([latexDocument]);

// console.log(splitDocuments);

const enc = getEncoding("cl100k_base");
splitDocuments.forEach((document) => {
  console.log(document);
  console.log("character length: ", document.pageContent.length);
  console.log("token length: ", enc.encode(document.pageContent).length);
});
