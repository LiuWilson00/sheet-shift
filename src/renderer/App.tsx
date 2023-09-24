import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import Hello from './pages/home';
import Loading from './components/loading';
import { LoadingProvider, useLoading } from './contexts/loading.context';
import Layout from './layout';
import { DialogProvider } from './contexts/dialog.context';
export default function App() {
  return (
    <LoadingProvider>
      <DialogProvider>
        <Layout>
          <Router>
            <Routes>
              <Route path="/" element={<Hello />} />
            </Routes>
          </Router>
        </Layout>
      </DialogProvider>
    </LoadingProvider>
  );
}
