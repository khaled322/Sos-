import React, { createContext, useContext, PropsWithChildren, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { Product, Customer, Category, Settings, Invoice } from '../types';

interface DataContextType {
    products: Product[] | null;
    customers: Customer[] | null;
    categories: Category[] | null;
    settings: Settings | null;
    invoices: Invoice[] | null;
    loading: {
        products: boolean;
        customers: boolean;
        categories: boolean;
        settings: boolean;
        invoices: boolean;
    };
    error: any;
    refetch: {
        products: () => void;
        customers: () => void;
        categories: () => void;
        settings: () => void;
        invoices: () => void;
        all: () => void;
    };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: PropsWithChildren<{}>) => {
    const { data: products, loading: productsLoading, error: productsError, refetch: refetchProducts } = useApi<Product[]>('products');
    const { data: customers, loading: customersLoading, error: customersError, refetch: refetchCustomers } = useApi<Customer[]>('customers');
    const { data: categories, loading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useApi<Category[]>('categories');
    const { data: settings, loading: settingsLoading, error: settingsError, refetch: refetchSettings } = useApi<Settings>('settings');
    const { data: invoices, loading: invoicesLoading, error: invoicesError, refetch: refetchInvoices } = useApi<Invoice[]>('invoices');

    const refetchAll = useCallback(() => {
        refetchProducts();
        refetchCustomers();
        refetchCategories();
        refetchSettings();
        refetchInvoices();
    }, [refetchProducts, refetchCustomers, refetchCategories, refetchSettings, refetchInvoices]);

    const value = {
        products,
        customers,
        categories,
        settings,
        invoices,
        loading: {
            products: productsLoading,
            customers: customersLoading,
            categories: categoriesLoading,
            settings: settingsLoading,
            invoices: invoicesLoading,
        },
        error: productsError || customersError || categoriesError || settingsError || invoicesError,
        refetch: {
            products: refetchProducts,
            customers: refetchCustomers,
            categories: refetchCategories,
            settings: refetchSettings,
            invoices: refetchInvoices,
            all: refetchAll,
        }
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
