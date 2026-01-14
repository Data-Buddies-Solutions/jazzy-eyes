'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, AlertCircle } from 'lucide-react';
import { BrandAccordion } from '@/components/admin/BrandAccordion';
import { CompanyForm } from '@/components/admin/CompanyForm';
import { BrandForm } from '@/components/admin/BrandForm';
import { ConfirmationModal } from '@/components/admin/ConfirmationModal';
import type {
  CompanyGroup,
  BrandWithDetails,
  CreateCompanyData,
  CreateBrandData,
  UpdateBrandData,
  UpdateCompanyData,
} from '@/types/admin';

export default function BrandsPage() {
  const [companies, setCompanies] = useState<CompanyGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [addCompanyModalOpen, setAddCompanyModalOpen] = useState(false);
  const [editCompanyModalOpen, setEditCompanyModalOpen] = useState(false);
  const [addBrandModalOpen, setAddBrandModalOpen] = useState(false);
  const [editBrandModalOpen, setEditBrandModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);

  // Selected data
  const [selectedCompany, setSelectedCompany] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<BrandWithDetails | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<any>(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  // Saving states
  const [isSaving, setIsSaving] = useState(false);

  // Key to force form reset
  const [brandFormKey, setBrandFormKey] = useState(0);

  // Track which accordion is open
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);

  // Load brands
  const loadBrands = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/brands');
      const data = await response.json();

      if (data.success && data.companies) {
        setCompanies(data.companies);
      } else {
        setError('Failed to load brands');
      }
    } catch (err) {
      console.error('Error loading brands:', err);
      setError('Failed to load brands');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  // Filter companies by search query
  const filteredCompanies = useMemo(() => {
    if (!searchQuery) return companies;

    const query = searchQuery.toLowerCase();
    return companies
      .map((company) => ({
        ...company,
        brands: company.brands.filter((brand) =>
          brand.brandName.toLowerCase().includes(query)
        ),
      }))
      .filter(
        (company) =>
          company.companyName.toLowerCase().includes(query) ||
          company.brands.length > 0
      );
  }, [companies, searchQuery]);

  // Handle create company
  const handleCreateCompany = async (data: CreateCompanyData) => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'company', ...data }),
      });

      const result = await response.json();

      if (result.success) {
        setAddCompanyModalOpen(false);
        // Automatically open the Add Brand modal for the new company
        setSelectedCompany({ id: result.companyId, name: data.companyName });
        setAddBrandModalOpen(true);
        setBrandFormKey((prev) => prev + 1); // Reset the form
        toast.success(`Company "${data.companyName}" created with ID: ${result.companyId}. Now add your first brand.`);
      } else {
        setError(result.error || 'Failed to create company');
      }
    } catch (err) {
      console.error('Error creating company:', err);
      setError('Failed to create company');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit company
  const handleEditCompany = (companyId: number, companyName: string) => {
    setSelectedCompany({ id: companyId, name: companyName });
    setEditCompanyModalOpen(true);
  };

  const handleUpdateCompany = async (data: UpdateCompanyData) => {
    if (!selectedCompany) return;

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/brands/company/${selectedCompany.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setEditCompanyModalOpen(false);
        setSelectedCompany(null);
        await loadBrands();
        toast.success(`Company updated successfully. ${result.updatedCount} brand(s) affected.`);
      } else {
        setError(result.error || 'Failed to update company');
      }
    } catch (err) {
      console.error('Error updating company:', err);
      setError('Failed to update company');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle add brand
  const handleAddBrand = (companyId: number, companyName: string) => {
    setSelectedCompany({ id: companyId, name: companyName });
    setAddBrandModalOpen(true);
    // Keep the accordion open for this company
    setOpenAccordion(companyId.toString());
  };

  const handleCreateBrand = async (data: CreateBrandData | UpdateBrandData) => {
    if (!selectedCompany) return;

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'brand',
          ...data,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAddBrandModalOpen(false);
        setSelectedCompany(null);
        await loadBrands();
      } else {
        setError(result.error || 'Failed to create brand');
      }
    } catch (err) {
      console.error('Error creating brand:', err);
      setError('Failed to create brand');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit brand
  const handleEditBrand = (brand: BrandWithDetails) => {
    setSelectedBrand(brand);
    setEditBrandModalOpen(true);
  };

  const handleUpdateBrand = async (data: UpdateBrandData) => {
    if (!selectedBrand) return;

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/brands/${selectedBrand.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success && result.requiresConfirmation) {
        // Show confirmation modal
        setPendingUpdate({ ...data, confirmed: true });
        setConfirmMessage(result.message);
        setConfirmModalOpen(true);
        setIsSaving(false);
        return;
      }

      if (result.success) {
        setEditBrandModalOpen(false);
        setSelectedBrand(null);
        await loadBrands();
        toast.success('Brand updated successfully');
      } else {
        setError(result.error || 'Failed to update brand');
      }
    } catch (err) {
      console.error('Error updating brand:', err);
      setError('Failed to update brand');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle confirmed update
  const handleConfirmedUpdate = async () => {
    if (!selectedBrand || !pendingUpdate) return;

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/brands/${selectedBrand.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingUpdate),
      });

      const result = await response.json();

      if (result.success) {
        setConfirmModalOpen(false);
        setEditBrandModalOpen(false);
        setSelectedBrand(null);
        setPendingUpdate(null);
        await loadBrands();
        toast.success('Brand updated successfully');
      } else {
        setError(result.error || 'Failed to update brand');
      }
    } catch (err) {
      console.error('Error updating brand:', err);
      setError('Failed to update brand');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete brand
  const handleDeleteBrand = (brand: BrandWithDetails) => {
    // Check if brand has products
    if (brand.productCount > 0) {
      setError(
        `Cannot delete "${brand.brandName}" - it has ${brand.productCount} product(s) associated with it. Please remove all products first or edit the brand instead.`
      );
      return;
    }

    // Set selected brand and show confirmation modal
    setSelectedBrand(brand);
    setConfirmMessage(
      `Are you sure you want to delete "${brand.brandName}" (ID: ${brand.id})? This action cannot be undone.`
    );
    setDeleteConfirmModalOpen(true);
  };

  // Handle confirmed delete
  const handleConfirmedDelete = async () => {
    if (!selectedBrand) return;

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/brands/${selectedBrand.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setDeleteConfirmModalOpen(false);
        setSelectedBrand(null);
        await loadBrands();
      } else {
        setError(result.error || 'Failed to delete brand');
      }
    } catch (err) {
      console.error('Error deleting brand:', err);
      setError('Failed to delete brand');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Manage Brands</h1>
          <p className="text-gray-600">
            Manage companies and their brand allocations
          </p>
        </div>
        <Button
          onClick={() => setAddCompanyModalOpen(true)}
          className="bg-sky-deeper hover:bg-sky-deeper/90 text-black font-semibold border-2 border-black"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Company
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-2 border-red-500 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600">{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Bar */}
      <div className="bg-white border-2 border-black rounded-lg p-6">
        <Input
          placeholder="Search companies or brands..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-2 border-black"
        />
        {searchQuery && (
          <p className="text-sm text-gray-600 mt-2">
            Showing {filteredCompanies.length} of {companies.length} companies
          </p>
        )}
      </div>

      {/* Brand Accordion */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-sky-deeper" />
        </div>
      ) : (
        <BrandAccordion
          companies={filteredCompanies}
          onEditCompany={handleEditCompany}
          onAddBrand={handleAddBrand}
          onEditBrand={handleEditBrand}
          onDeleteBrand={handleDeleteBrand}
          openAccordion={openAccordion}
          onAccordionChange={setOpenAccordion}
        />
      )}

      {/* Add Company Modal */}
      <Dialog open={addCompanyModalOpen} onOpenChange={setAddCompanyModalOpen}>
        <DialogContent className="border-2 border-black">
          <DialogTitle>Add New Company</DialogTitle>
          <CompanyForm
            onSubmit={handleCreateCompany}
            isLoading={isSaving}
            submitLabel="Create Company"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Company Modal */}
      <Dialog open={editCompanyModalOpen} onOpenChange={setEditCompanyModalOpen}>
        <DialogContent className="border-2 border-black">
          <DialogTitle>Edit Company</DialogTitle>
          <CompanyForm
            onSubmit={handleUpdateCompany}
            defaultValues={{ companyName: selectedCompany?.name || '' }}
            isLoading={isSaving}
            submitLabel="Update Company"
          />
        </DialogContent>
      </Dialog>

      {/* Add Brand Modal */}
      <Dialog open={addBrandModalOpen} onOpenChange={setAddBrandModalOpen}>
        <DialogContent className="border-2 border-black">
          <DialogTitle>Add New Brand to {selectedCompany?.name}</DialogTitle>
          <BrandForm
            key={brandFormKey}
            mode="create"
            onSubmit={handleCreateBrand}
            companyName={selectedCompany?.name}
            companyId={selectedCompany?.id}
            isLoading={isSaving}
            submitLabel="Create Brand"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Brand Modal */}
      <Dialog open={editBrandModalOpen} onOpenChange={setEditBrandModalOpen}>
        <DialogContent className="border-2 border-black">
          <DialogTitle>Edit Brand</DialogTitle>
          {selectedBrand && (
            <BrandForm
              mode="edit"
              onSubmit={handleUpdateBrand}
              defaultValues={{
                id: selectedBrand.id,
                brandName: selectedBrand.brandName,
                allocationQuantity: selectedBrand.allocationQuantity,
              }}
              isLoading={isSaving}
              submitLabel="Update Brand"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal - Brand Update */}
      <ConfirmationModal
        open={confirmModalOpen}
        onOpenChange={setConfirmModalOpen}
        title="Confirm Update"
        description={confirmMessage}
        onConfirm={handleConfirmedUpdate}
        isLoading={isSaving}
      />

      {/* Confirmation Modal - Brand Delete */}
      <ConfirmationModal
        open={deleteConfirmModalOpen}
        onOpenChange={setDeleteConfirmModalOpen}
        title="Confirm Delete"
        description={confirmMessage}
        onConfirm={handleConfirmedDelete}
        isLoading={isSaving}
      />
    </div>
  );
}
