<table>
  <tr>
    <td width="120">
      <img src="src/public/logo.svg" width="96" height="96" alt="IM Planner logo" />
    </td>
    <td>
      <h1>IM-DOE Planner</h1>
      <p>Local, offline-first DOE planner for injection molding.</p>
      <p><strong>Stack:</strong></p>
      <p>
        <img src="https://img.shields.io/badge/Node.js-20.x-1f6feb?style=flat&logo=node.js&logoColor=white" alt="Node.js" />
        <img src="https://img.shields.io/badge/Express-4.x-111111?style=flat&logo=express&logoColor=white" alt="Express" />
        <img src="https://img.shields.io/badge/SQLite-better--sqlite3-0b5fa5?style=flat&logo=sqlite&logoColor=white" alt="SQLite" />
        <img src="https://img.shields.io/badge/EJS-3.x-8c4b32?style=flat&logo=ejs&logoColor=white" alt="EJS" />
        <img src="https://img.shields.io/badge/PureCSS-3.x-2f9c74?style=flat&logo=css3&logoColor=white" alt="PureCSS" />
        <img src="https://img.shields.io/badge/ECharts-5.x-c23531?style=flat" alt="ECharts" />
        <img src="https://img.shields.io/badge/jStat-1.x-6a5acd?style=flat" alt="jStat" />
        <img src="https://img.shields.io/badge/Editor.js-2.x-2c2f36?style=flat" alt="Editor.js" />
      </p>
    </td>
  </tr>
</table>

## Install + Run
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

## Core Flows
1) Import recipes from a CSV/TSV matrix.
2) Create an experiment (BBD/FFA/SCREEN/SIM).
3) Configure factors and defaults.
4) Generate a runlist.
5) Enter run data and defect tags.
6) Review analysis (charts + heatmap + 3D when possible).
7) Export runs (wide or long CSV).

## Qualification (Scientific Molding)
The qualification flow includes 6 steps based on scientific molding methodology:
1) Rheology / Viscosity curve
2) Cavity balance
3) Pressure drop
4) Cosmetic process window
5) Gate seal study
6) Cooling time optimization

Reference book (Amazon search):
- Robust Process Development and Scientific Molding (Suhas Kulkarni): https://a.co/d/aDv52KL

## Report Plan (Next Work)
The current report plan lives at `report_plan` in the project root. That file is the source of truth
for the upcoming HTML/PDF/CSV report work and should be reviewed first before coding.

## Recent Changes (for handoff)
- Machine library now supports parameter tokens in the format `%machineId:paramId%`.
  These tokens can be used inside qualification setup inputs and custom fields.
- UI shows live previews for tokenized values; inputs keep the token, summaries display the resolved value.
- Step calculations resolve tokens at runtime (server + client), so values survive reloads.
- Machine edit page shows a small read-only token field next to each parameter for quick copy.
- Report generator now saves report configs per experiment (multiple reports per experiment).
- Report list lives inside the experiment, right after Detailed Optimization.
- Report editor (Editor.js) with seeded structure and embedded charts (rheology + process window).
- Editable report documents are stored in `report_documents` and opened via `/reports/:id/editor`.

## Supported Recipe Import Formats
The importer accepts two common formats:

### 1) Matrix format
```
Component,Recipe A,Recipe B
Resin 1,50,60
Resin 2,50,40
Additive,3,2
```
- Column 0: component name
- Other columns: recipe name with PHR values

### 2) Two-row header (BPACKs style)
```
,Recipe A,,Recipe B,
,phr,,phr,
Resin 1,50,,60,
Resin 2,50,,40,
Additive,3,,2,
```
- Row 1 contains recipe names
- Row 2 contains `phr` under recipe columns
- Subsequent rows are components

## Notes
- The SQLite database is `im_doe.sqlite` in this folder.
- Custom input/output fields are stored in the flexible `param_definitions` and `run_values` tables.
- SCREEN design is a sampled factorial (labeled in-app). For higher rigor, add a dedicated generator.

## Scripts
- `npm run dev` - start with hot reload
- `npm run build` - compile to `dist/`
- `npm run start` - run compiled output
