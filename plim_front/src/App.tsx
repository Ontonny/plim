import React, { useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Users from './pages/Users';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import './styles.scss'
import PlansWizard from './pages/PipelinesWizard.tsx';
import LoginForm from './pages/LoginForm.tsx'
import { useAuthenticationStore, useMenuStore } from './store.ts';
import GenUserPassword from './pages/GenUserPassword.tsx';
import Footer from './components/Footer.tsx';
import LogsTable from './pages/LogsTable.tsx';
import Settings from './pages/Settings.tsx';
import TreePage from './pages/TreePage.tsx';
import { Route, BrowserRouter as Router, Routes, useParams } from 'react-router-dom';
import EtcdControl from './pages/EtcdControl.tsx';


if (process.env.NODE_ENV === 'production') {
    console.log = () => { };
    console.warn = () => { };
    // console.error = () => { };
    console.info = () => { };
    console.debug = () => { };
}


const App: React.FC = () => {
    const { authenticated } = useAuthenticationStore();
    const renderPage = () => {
        return (
            <Routes>
                <Route path="/plans" element={ <PlansWizard id={'plans-panel'} />}>
                    <Route index element={ <PlansWizard id={'plans-panel'} />} />
                    <Route path=":planName" element={ <PlansWizard id={'plans-panel'}/>} />
                </Route>
                <Route path="/users" element={ <Users />} />
                <Route path="/logs" element={ <LogsTable />} />
                <Route path="/genPass" element={ <GenUserPassword />} />
                <Route path="/settings" element={ <Settings />} />
                <Route path="/tree" element={ <TreePage />} />
                <Route path="/etcd" element={ <EtcdControl />} />
            </Routes>
        )
    };
    return (
        <Router>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                {authenticated ? (
                    <>
                        <Header />
                        <div style={{ display: 'flex', flex: 1, margin: '0px', padding: '0px' }}>
                            <div style={{ display: 'flex', width: '100px', padding: '5px', flexDirection: 'column', flexShrink: 0 }} >
                                <Sidebar/>
                            </div>
                            <div
                                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}
                            >
                                {renderPage()}
                            </div>
                        </div>
                    </>) : (<LoginForm />)}
                <Footer />
            </div>
        </Router>
    );
};


export default App;
