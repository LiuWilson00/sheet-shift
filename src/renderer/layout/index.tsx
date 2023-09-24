import React, { PropsWithChildren } from 'react';
import { useLoading } from '../contexts/loading.context';
import Loading from '../components/loading';
const Layout: React.FC<PropsWithChildren> = ({ children }) => {
  const { isLoading } = useLoading();
  return (
    <div>
      {children}
      <Loading isVisible={isLoading} />
    </div>
  );
};

export default Layout;
