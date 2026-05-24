'use client';

import type { CatalogModelCreateInput } from '@tirely/validators';
import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Select,
  Spinner,
  Text,
  TextField,
} from '@radix-ui/themes';
import { Check, ChevronRight, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { ApiCatalogBrand, ApiCatalogModel, ApiCatalogSize } from '@tirely/types';
import { authRequest } from '@/lib/http';

interface CatalogPickerValue {
  brand: ApiCatalogBrand;
  model: ApiCatalogModel;
  size: ApiCatalogSize | null;
}

interface CatalogPickerProps {
  value: CatalogPickerValue | null;
  onChange: (value: CatalogPickerValue) => void;
}

const TIRE_CATEGORIES = [
  { value: 'STEER', label: 'Steer' },
  { value: 'DRIVE', label: 'Drive' },
  { value: 'TRAILER', label: 'Trailer' },
  { value: 'ALL_POSITION', label: 'All Position' },
  { value: 'WINTER', label: 'Winter' },
  { value: 'OTHER', label: 'Other' },
] as const;

const statusBadge = (status: ApiCatalogBrand['status'] | ApiCatalogModel['status']) => {
  if (status === 'PENDING') {
    return (
      <Badge color="orange" size="1">
        Pending
      </Badge>
    );
  }

  if (status === 'REJECTED') {
    return (
      <Badge color="red" size="1">
        Rejected
      </Badge>
    );
  }

  return null;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const listCatalogBrands = (search?: string, signal?: AbortSignal) => {
  const params = new URLSearchParams({ perPage: '20' });
  if (search) params.set('search', search);
  return authRequest<ApiCatalogBrand[]>(`/v1/catalog/brands?${params}`, { signal });
};

const listCatalogModels = (brandId: string, search?: string, signal?: AbortSignal) => {
  const params = new URLSearchParams({ perPage: '20' });
  if (search) params.set('search', search);
  return authRequest<ApiCatalogModel[]>(`/v1/catalog/brands/${brandId}/models?${params}`, {
    signal,
  });
};

const listCatalogSizes = (modelId: string, signal?: AbortSignal) =>
  authRequest<ApiCatalogSize[]>(`/v1/catalog/models/${modelId}/sizes`, { signal });

export function CatalogPicker({ value, onChange }: CatalogPickerProps) {
  const [brandSearch, setBrandSearch] = useState('');
  const [brands, setBrands] = useState<ApiCatalogBrand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<ApiCatalogBrand | null>(value?.brand ?? null);

  const [modelSearch, setModelSearch] = useState('');
  const [models, setModels] = useState<ApiCatalogModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ApiCatalogModel | null>(value?.model ?? null);

  const [sizes, setSizes] = useState<ApiCatalogSize[]>([]);
  const [selectedSizeId, setSelectedSizeId] = useState<string>(value?.size?.id ?? '');

  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandOpen, setNewBrandOpen] = useState(false);
  const [submittingBrand, setSubmittingBrand] = useState(false);

  const [newModelOpen, setNewModelOpen] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelCategory, setNewModelCategory] = useState('');
  const [newModelTread, setNewModelTread] = useState('');
  const [newModelMileage, setNewModelMileage] = useState('');
  const [newModelSizeWidth, setNewModelSizeWidth] = useState('');
  const [newModelSizeAspect, setNewModelSizeAspect] = useState('');
  const [newModelSizeRim, setNewModelSizeRim] = useState('');
  const [submittingModel, setSubmittingModel] = useState(false);

  const debouncedBrandSearch = useDebounce(brandSearch, 300);
  const debouncedModelSearch = useDebounce(modelSearch, 300);

  useEffect(() => {
    const controller = new AbortController();
    setBrandsLoading(true);
    listCatalogBrands(debouncedBrandSearch || undefined, controller.signal)
      .then((res) => {
        if ('code' in res) return;
        setBrands(res.data);
      })
      .finally(() => setBrandsLoading(false));
    return () => controller.abort();
  }, [debouncedBrandSearch]);

  useEffect(() => {
    if (!selectedBrand) return;
    const controller = new AbortController();
    setModelsLoading(true);
    listCatalogModels(selectedBrand.id, debouncedModelSearch || undefined, controller.signal)
      .then((res) => {
        if ('code' in res) return;
        setModels(res.data);
      })
      .finally(() => setModelsLoading(false));
    return () => controller.abort();
  }, [selectedBrand, debouncedModelSearch]);

  useEffect(() => {
    if (!selectedModel) return;
    const controller = new AbortController();
    listCatalogSizes(selectedModel.id, controller.signal).then((res) => {
      if ('code' in res) return;
      setSizes(res.data);
    });
    return () => controller.abort();
  }, [selectedModel]);

  const handleSelectBrand = useCallback((brand: ApiCatalogBrand) => {
    setSelectedBrand(brand);
    setSelectedModel(null);
    setSizes([]);
    setSelectedSizeId('');
    setModelSearch('');
  }, []);

  const handleSelectModel = useCallback((model: ApiCatalogModel) => {
    setSelectedModel(model);
    setSelectedSizeId('');
  }, []);

  const handleSizeChange = useCallback(
    (sizeId: string) => {
      setSelectedSizeId(sizeId);
      if (!selectedBrand || !selectedModel) return;
      const size = sizes.find((s) => s.id === sizeId) ?? null;
      onChange({ brand: selectedBrand, model: selectedModel, size });
    },
    [selectedBrand, selectedModel, sizes, onChange],
  );

  const handleSubmitBrand = async () => {
    if (!newBrandName.trim()) return;
    setSubmittingBrand(true);
    try {
      const res = await authRequest<ApiCatalogBrand>('/v1/catalog/brands', {
        method: 'POST',
        body: { name: newBrandName.trim() },
      });
      if ('code' in res) return;
      setBrands((prev) => [res.data, ...prev]);
      handleSelectBrand(res.data);
      setNewBrandOpen(false);
      setNewBrandName('');
    } finally {
      setSubmittingBrand(false);
    }
  };

  const handleSubmitModel = async () => {
    if (!selectedBrand || !newModelName.trim()) return;
    const width = parseInt(newModelSizeWidth, 10);
    const aspectRatio = parseInt(newModelSizeAspect, 10);
    const rimDiameter = parseFloat(newModelSizeRim);
    if (!width || !aspectRatio || !rimDiameter) return;

    const body: CatalogModelCreateInput = {
      brandId: selectedBrand.id,
      name: newModelName.trim(),
      sizes: [{ width, aspectRatio, rimDiameter }],
      ...(newModelCategory
        ? { category: newModelCategory as CatalogModelCreateInput['category'] }
        : {}),
      ...(newModelTread ? { defaultInitialTreadDepth: parseFloat(newModelTread) } : {}),
      ...(newModelMileage ? { defaultExpectedMileage: parseInt(newModelMileage, 10) } : {}),
    };

    setSubmittingModel(true);
    try {
      const res = await authRequest<ApiCatalogModel>('/v1/catalog/models', {
        method: 'POST',
        body,
      });
      if ('code' in res) return;
      setModels((prev) => [res.data, ...prev]);
      handleSelectModel(res.data);
      setNewModelOpen(false);
      setNewModelName('');
      setNewModelCategory('');
      setNewModelTread('');
      setNewModelMileage('');
      setNewModelSizeWidth('');
      setNewModelSizeAspect('');
      setNewModelSizeRim('');
    } finally {
      setSubmittingModel(false);
    }
  };

  return (
    <Flex direction="column" gap="3">
      <Box>
        <Text size="2" weight="medium" mb="1" as="p">
          Brand
        </Text>
        {selectedBrand ? (
          <Flex align="center" gap="2">
            <Text size="2">{selectedBrand.name}</Text>
            {selectedBrand.status === 'PENDING' && (
              <Badge color="orange" size="1">
                Pending approval
              </Badge>
            )}
            {selectedBrand.status === 'REJECTED' && (
              <Badge color="red" size="1">
                Rejected for global catalog
              </Badge>
            )}
            <Button
              variant="ghost"
              size="1"
              onClick={() => {
                setSelectedBrand(null);
                setSelectedModel(null);
                setSizes([]);
                setSelectedSizeId('');
              }}
            >
              <X size={12} /> Change
            </Button>
          </Flex>
        ) : (
          <>
            <TextField.Root
              placeholder="Search brands…"
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              mb="1"
            />
            <Card>
              {brandsLoading ? (
                <Flex p="2" justify="center">
                  <Spinner />
                </Flex>
              ) : brands.length === 0 ? (
                <Flex direction="column" gap="2" p="2">
                  <Text size="2" color="gray">
                    No brands found
                  </Text>
                  <Button variant="soft" size="1" onClick={() => setNewBrandOpen(true)}>
                    <Plus size={12} /> Add &ldquo;{brandSearch || 'new brand'}&rdquo;
                  </Button>
                </Flex>
              ) : (
                <Flex
                  direction="column"
                  gap="1"
                  p="1"
                  style={{ maxHeight: 200, overflowY: 'auto' }}
                >
                  {brands.map((brand) => (
                    <Button
                      key={brand.id}
                      variant="ghost"
                      size="2"
                      onClick={() => handleSelectBrand(brand)}
                      style={{ justifyContent: 'space-between' }}
                    >
                      <Flex align="center" gap="2">
                        {brand.name}
                        {statusBadge(brand.status)}
                      </Flex>
                      <ChevronRight size={14} />
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="1"
                    color="gray"
                    onClick={() => setNewBrandOpen(true)}
                  >
                    <Plus size={12} /> Add new brand
                  </Button>
                </Flex>
              )}
            </Card>
          </>
        )}
      </Box>

      {selectedBrand && (
        <Box>
          <Text size="2" weight="medium" mb="1" as="p">
            Model
          </Text>
          {selectedModel ? (
            <Flex align="center" gap="2">
              <Text size="2">{selectedModel.name}</Text>
              {selectedModel.status === 'PENDING' && (
                <Badge color="orange" size="1">
                  Pending approval
                </Badge>
              )}
              {selectedModel.status === 'REJECTED' && (
                <Badge color="red" size="1">
                  Rejected but still usable by your company
                </Badge>
              )}
              <Button
                variant="ghost"
                size="1"
                onClick={() => {
                  setSelectedModel(null);
                  setSelectedSizeId('');
                }}
              >
                <X size={12} /> Change
              </Button>
            </Flex>
          ) : (
            <>
              <TextField.Root
                placeholder="Search models…"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                mb="1"
              />
              <Card>
                {modelsLoading ? (
                  <Flex p="2" justify="center">
                    <Spinner />
                  </Flex>
                ) : models.length === 0 ? (
                  <Flex direction="column" gap="2" p="2">
                    <Text size="2" color="gray">
                      No models found
                    </Text>
                    <Button variant="soft" size="1" onClick={() => setNewModelOpen(true)}>
                      <Plus size={12} /> Add new model
                    </Button>
                  </Flex>
                ) : (
                  <Flex
                    direction="column"
                    gap="1"
                    p="1"
                    style={{ maxHeight: 200, overflowY: 'auto' }}
                  >
                    {models.map((model) => (
                      <Button
                        key={model.id}
                        variant="ghost"
                        size="2"
                        onClick={() => handleSelectModel(model)}
                        style={{ justifyContent: 'space-between' }}
                      >
                        <Flex align="center" gap="2">
                          {model.name}
                          {model.category && (
                            <Badge color="gray" size="1">
                              {model.category}
                            </Badge>
                          )}
                          {statusBadge(model.status)}
                        </Flex>
                        <ChevronRight size={14} />
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="1"
                      color="gray"
                      onClick={() => setNewModelOpen(true)}
                    >
                      <Plus size={12} /> Add new model
                    </Button>
                  </Flex>
                )}
              </Card>
            </>
          )}
        </Box>
      )}

      {selectedModel && (
        <Box>
          <Text size="2" weight="medium" mb="1" as="p">
            Size
          </Text>
          <Select.Root value={selectedSizeId} onValueChange={handleSizeChange}>
            <Select.Trigger placeholder="Select size…" style={{ width: '100%' }} />
            <Select.Content>
              {sizes.map((s) => (
                <Select.Item key={s.id} value={s.id}>
                  {s.width}/{s.aspectRatio}R{s.rimDiameter}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Box>
      )}

      <Dialog.Root open={newBrandOpen} onOpenChange={setNewBrandOpen}>
        <Dialog.Content maxWidth="400px">
          <Dialog.Title>Add new brand</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            The brand will be submitted for admin approval before it appears to other companies.
          </Dialog.Description>
          <TextField.Root
            placeholder="Brand name"
            value={newBrandName}
            onChange={(e) => setNewBrandName(e.target.value)}
            mb="3"
          />
          <Flex gap="2" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleSubmitBrand} disabled={!newBrandName.trim() || submittingBrand}>
              {submittingBrand ? <Spinner /> : <Check size={14} />}
              Submit brand
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={newModelOpen} onOpenChange={setNewModelOpen}>
        <Dialog.Content maxWidth="480px">
          <Dialog.Title>Add new model</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            The model will be submitted for admin approval. You can continue using it in the
            meantime.
          </Dialog.Description>
          <Flex direction="column" gap="3">
            <TextField.Root
              placeholder="Model name *"
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
            />
            <Select.Root value={newModelCategory} onValueChange={setNewModelCategory}>
              <Select.Trigger placeholder="Category (optional)" style={{ width: '100%' }} />
              <Select.Content>
                {TIRE_CATEGORIES.map((c) => (
                  <Select.Item key={c.value} value={c.value}>
                    {c.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <Flex gap="2">
              <TextField.Root
                placeholder="Default tread depth (mm)"
                value={newModelTread}
                onChange={(e) => setNewModelTread(e.target.value)}
                type="number"
                style={{ flex: 1 }}
              />
              <TextField.Root
                placeholder="Expected mileage (km)"
                value={newModelMileage}
                onChange={(e) => setNewModelMileage(e.target.value)}
                type="number"
                style={{ flex: 1 }}
              />
            </Flex>
            <Text size="2" weight="medium">
              Initial size *
            </Text>
            <Flex gap="2">
              <TextField.Root
                placeholder="Width (e.g. 315)"
                value={newModelSizeWidth}
                onChange={(e) => setNewModelSizeWidth(e.target.value)}
                type="number"
                style={{ flex: 1 }}
              />
              <TextField.Root
                placeholder="Aspect (e.g. 80)"
                value={newModelSizeAspect}
                onChange={(e) => setNewModelSizeAspect(e.target.value)}
                type="number"
                style={{ flex: 1 }}
              />
              <TextField.Root
                placeholder="Rim (e.g. 22.5)"
                value={newModelSizeRim}
                onChange={(e) => setNewModelSizeRim(e.target.value)}
                type="number"
                style={{ flex: 1 }}
              />
            </Flex>
          </Flex>
          <Flex gap="2" justify="end" mt="4">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              onClick={handleSubmitModel}
              disabled={
                !newModelName.trim() ||
                !newModelSizeWidth ||
                !newModelSizeAspect ||
                !newModelSizeRim ||
                submittingModel
              }
            >
              {submittingModel ? <Spinner /> : <Check size={14} />}
              Submit model
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}
