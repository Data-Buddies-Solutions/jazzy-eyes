'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Edit, Plus, Trash2 } from 'lucide-react';
import type { CompanyGroup, BrandWithDetails } from '@/types/admin';

interface BrandAccordionProps {
  companies: CompanyGroup[];
  onEditCompany: (companyId: number, companyName: string) => void;
  onAddBrand: (companyId: number, companyName: string) => void;
  onEditBrand: (brand: BrandWithDetails) => void;
  onDeleteBrand: (brand: BrandWithDetails) => void;
  openAccordion?: string;
  onAccordionChange?: (value: string | undefined) => void;
}

export function BrandAccordion({
  companies,
  onEditCompany,
  onAddBrand,
  onEditBrand,
  onDeleteBrand,
  openAccordion,
  onAccordionChange,
}: BrandAccordionProps) {
  if (companies.length === 0) {
    return (
      <Card className="border-2 border-black p-12">
        <p className="text-center text-gray-600">
          No companies found. Create your first company to get started.
        </p>
      </Card>
    );
  }

  return (
    <Accordion
      type="single"
      collapsible
      className="space-y-4"
      value={openAccordion}
      onValueChange={onAccordionChange}
    >
      {companies.map((company) => (
        <AccordionItem
          key={company.companyId}
          value={company.companyId.toString()}
          className="border-2 border-black rounded-lg overflow-hidden"
        >
          <AccordionTrigger className="px-6 py-4 bg-sky-soft hover:bg-sky-soft/80 transition-colors">
            <div className="flex justify-between items-center w-full pr-4 text-left">
              <div>
                <span className="font-bold text-lg">
                  {company.companyName} <span className="text-gray-600">(ID: {company.companyId})</span>
                </span>
              </div>
              <div className="flex gap-6 text-sm text-gray-600">
                <span>
                  <strong>{company.totalBrands}</strong> brands
                </span>
                <span>
                  Total Allocation: <strong>{company.totalAllocation}</strong>
                </span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 py-4 bg-white">
            {/* Company Actions */}
            <div className="flex gap-2 mb-4 pb-4 border-b-2 border-gray-200">
              <Button
                onClick={() => onEditCompany(company.companyId, company.companyName)}
                variant="outline"
                size="sm"
                className="border-2 border-black"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Company
              </Button>
              <Button
                onClick={() => onAddBrand(company.companyId, company.companyName)}
                size="sm"
                className="bg-sky-deeper hover:bg-sky-deeper/90 text-black font-semibold border-2 border-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Brand
              </Button>
            </div>

            {/* Brand Cards */}
            {company.brands.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No brands yet. Click "Add Brand" to create one.
              </p>
            ) : (
              <div className="grid gap-3">
                {company.brands.map((brand) => (
                  <Card
                    key={brand.id}
                    className="border-2 border-black p-4 hover:bg-sky-soft/20 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-2">{brand.brandName}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Brand ID:</span>
                            <p className="font-semibold">{brand.id}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Allocation:</span>
                            <p className="font-semibold">{brand.allocationQuantity}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Products:</span>
                            <p className="font-semibold">{brand.productCount}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          onClick={() => onEditBrand(brand)}
                          variant="outline"
                          size="sm"
                          className="border-2 border-black"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => onDeleteBrand(brand)}
                          variant="outline"
                          size="sm"
                          className="border-2 border-red-500 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
