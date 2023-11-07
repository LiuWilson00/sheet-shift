import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import Hello from './pages/home';

import { LoadingProvider } from './contexts/loading.context';
import Layout from './layout';
import { DialogProvider } from './contexts/dialog.context';
import { SettingsProvider } from './contexts/settings-dialog-context/indext';
import { SheetSettingsProvider } from './contexts/sheet-settings-dialog-context';
import { AuthDialogProvider } from './contexts/auth-dialog-context';
const wrapWithProviders = (
  child: React.ReactNode,
  providers: React.ComponentType<any>[],
) => {
  return providers.reduceRight((acc, Provider) => {
    return <Provider>{acc}</Provider>;
  }, child);
};
export default function App() {
  const providers = [
    LoadingProvider,
    DialogProvider,
    SheetSettingsProvider,
    SettingsProvider,
    AuthDialogProvider,
  ];

  return wrapWithProviders(
    <Layout>
      <Router>
        <Routes>
          <Route path="/" element={<Hello />} />
        </Routes>
      </Router>
    </Layout>,
    providers,
  );
}
