# RegressLab Studio — Regression Comparison Dashboard

A React + Vite dashboard for IALM Experiment 2. It compares **Linear Regression, Ridge Regression, and Lasso Regression** on a built-in demonstration dataset or a user-uploaded CSV.

## Features
- Upload your own `.csv` dataset locally (the file is read in your browser; it is not sent to a server).
- Select numeric feature columns and a numeric target column.
- Adjustable train/test split and regularization strength (alpha).
- Test-set MAE, MSE, RMSE, and R² for all three models.
- Interactive Plotly visuals: R² comparison, actual-vs-predicted, residual plot, MAE/RMSE comparison, feature/target scatter, and residual histogram.
- Highlights the top model by test-set R² and exports metric results to CSV.
- Responsive dark dashboard layout with a different information architecture and styling from the supplied demo.

## Run locally
1. Install Node.js (LTS recommended).
2. Extract this ZIP.
3. Open a terminal inside the extracted `regresslab_compare` folder.
4. Run:
   ```bash
   npm install
   npm run dev
   ```
5. Open the local URL printed by Vite (usually `http://localhost:5173`).

To create a production build: `npm run build`.

## Publish on GitHub Pages

This repository includes a GitHub Actions workflow that builds the app and deploys it to GitHub Pages whenever you push to `main`.

1. Create a **public** GitHub repository (for example, `regresslab-compare`).
2. Upload the contents of this project folder to the repository. Include `.github/workflows/deploy.yml`; do not upload `node_modules` or `dist`.
3. In the repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
4. Open the **Actions** tab and wait for **Deploy to GitHub Pages** to finish. GitHub will show the public site URL in the deployment details. The URL is usually `https://<your-username>.github.io/<repository-name>/`.

Each later push to `main` automatically rebuilds and republishes the site.

## CSV format
- First row must contain column names.
- Include at least two numeric columns (one or more features and one target).
- The app uses complete rows for the selected features/target; rows with missing or non-numeric selected values are skipped for fitting.
- Example:
  ```csv
  Area,Rooms,Price
  850,2,125000
  1100,3,165000
  1400,3,210000
  1700,4,265000
  2000,4,310000
  2250,5,350000
  ```
## Notes on interpretation
- Lower MAE/MSE/RMSE is better; higher R² is better.
- Model ranking uses test-set R². Also inspect the error metrics and plots rather than relying on a single score.
- This is an educational client-side implementation. Results may differ from scikit-learn because solvers, split strategy, and optimization details differ. It is not intended as a substitute for robust validation on production data.
