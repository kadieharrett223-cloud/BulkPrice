import { useState } from "react";
import { PriceFilter } from "@/types";
import { ChevronRight } from "lucide-react";

interface FilterStepProps {
  onNext: (filters: PriceFilter) => void;
}

export default function FilterStep({ onNext }: FilterStepProps) {
  const [collections, setCollections] = useState<string[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<Array<"active" | "draft" | "archived">>([]);
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(1000);
  const [inventoryMin, setInventoryMin] = useState<number>(0);
  const [inventoryMax, setInventoryMax] = useState<number>(10000);

  const handleNext = () => {
    const filters: PriceFilter = {};

    if (collections.length) filters.collections = collections;
    if (vendors.length) filters.vendors = vendors;
    if (productTypes.length) filters.productTypes = productTypes;
    if (statuses.length) filters.statuses = statuses;
    if (tags.length) filters.tags = tags;
    if (priceMin > 0 || priceMax < 1000) {
      filters.priceRange = { min: priceMin, max: priceMax };
    }
    if (inventoryMin > 0 || inventoryMax < 10000) {
      filters.inventoryRange = { min: inventoryMin, max: inventoryMax };
    }

    onNext(filters);
  };

  const addTag = (item: string, setState: (items: string[]) => void, items: string[]) => {
    if (item && !items.includes(item)) {
      setState([...items, item]);
    }
  };

  const removeTag = (item: string, setState: (items: string[]) => void, items: string[]) => {
    setState(items.filter((i) => i !== item));
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Step 1: Select Products to Edit
        </h2>
        <p className="text-gray-600 mb-6">
          Use filters to target specific products. Leave empty to select all products.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Collections */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Collections
          </label>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Enter collection and press Enter"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  addTag(
                    (e.target as HTMLInputElement).value,
                    setCollections,
                    collections
                  );
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify"
            />
            <div className="flex flex-wrap gap-2 pt-2">
              {collections.map((col) => (
                <span
                  key={col}
                  className="bg-shopify text-white px-3 py-1 rounded-full text-sm flex items-center space-x-2"
                >
                  <span>{col}</span>
                  <button
                    onClick={() => removeTag(col, setCollections, collections)}
                    className="hover:text-red-200"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Vendors */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Vendors</label>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Enter vendor and press Enter"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  addTag(
                    (e.target as HTMLInputElement).value,
                    setVendors,
                    vendors
                  );
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify"
            />
            <div className="flex flex-wrap gap-2 pt-2">
              {vendors.map((vendor) => (
                <span
                  key={vendor}
                  className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-2"
                >
                  <span>{vendor}</span>
                  <button
                    onClick={() => removeTag(vendor, setVendors, vendors)}
                    className="hover:text-red-200"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Product Types */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Product Types
          </label>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Enter product type and press Enter"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  addTag(
                    (e.target as HTMLInputElement).value,
                    setProductTypes,
                    productTypes
                  );
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-shopify"
            />
            <div className="flex flex-wrap gap-2 pt-2">
              {productTypes.map((type) => (
                <span
                  key={type}
                  className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-2"
                >
                  <span>{type}</span>
                  <button
                    onClick={() => removeTag(type, setProductTypes, productTypes)}
                    className="hover:text-red-200"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Price Range
          </label>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600">Minimum: ${priceMin}</label>
              <input
                type="range"
                min="0"
                max="1000"
                value={priceMin}
                onChange={(e) => setPriceMin(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Maximum: ${priceMax}</label>
              <input
                type="range"
                min="0"
                max="1000"
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Inventory Range */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Inventory Range
          </label>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600">Minimum: {inventoryMin}</label>
              <input
                type="range"
                min="0"
                max="10000"
                value={inventoryMin}
                onChange={(e) => setInventoryMin(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Maximum: {inventoryMax}</label>
              <input
                type="range"
                min="0"
                max="10000"
                value={inventoryMax}
                onChange={(e) => setInventoryMax(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Product Status */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Product Status
          </label>
          <div className="space-y-2">
            {(["active", "draft", "archived"] as const).map((status) => (
              <label key={status} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={statuses.includes(status)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setStatuses([...statuses, status]);
                    } else {
                      setStatuses(statuses.filter((s) => s !== status));
                    }
                  }}
                  className="w-4 h-4 rounded"
                />
                <span className="capitalize text-gray-700">{status}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Next Button */}
      <div className="flex justify-end">
        <button
          onClick={handleNext}
          className="flex items-center space-x-2 bg-shopify text-white font-semibold py-3 px-8 rounded-lg hover:bg-opacity-90 transition-all"
        >
          <span>Next: Choose Action</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
