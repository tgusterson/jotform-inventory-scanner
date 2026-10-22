import { BarcodeScanner } from "./components/BarcodeScanner/BarcodeScanner";
import type { ColumnConfig } from "./components/BarcodeScanner/types";

type AppProps = {
  columns: ColumnConfig[];
  initialValue: string;
};

export default function App({ columns, initialValue }: AppProps) {
  return <BarcodeScanner columns={columns} initialValue={initialValue} />;
}