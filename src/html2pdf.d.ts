// html2pdf.js ships no types; the AI review report (utils/report-pdf.ts) types what it uses.
declare module 'html2pdf.js' {
  const html2pdf: () => unknown
  export default html2pdf
}
