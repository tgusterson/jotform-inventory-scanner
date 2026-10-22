import { BarcodeScanner } from "./components/BarcodeScanner/BarcodeScanner";
import type { ColumnConfig } from "./components/BarcodeScanner/types";

type AppProps = {
  columns: ColumnConfig[];
};

export default function App({ columns }: AppProps) {
  return <BarcodeScanner columns={columns} />;
}