# Azure Billings Invoice Downloader Script

A simple [Bun](https://bun.sh)-script that downloads your Azure subscription billings invoice files given the specified period and naming the files according to your specified preferences.

1. Before running the script add a Azure App user and assign it the role "Billing Reader".
2. Rename the file `example.env` to `.env` and add your Azure App user credentials. 
3. Edit the subscriptions, filename format, date periods in the `index.ts` file.
4. Run...

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.0. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
