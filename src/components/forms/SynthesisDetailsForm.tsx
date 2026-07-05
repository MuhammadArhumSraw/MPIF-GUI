import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SynthesisDetails } from '@/types/mpif';
import { Plus, Trash2 } from 'lucide-react';
import { EditableSelect } from '../ui/EditableSelect';
import { useEffect, useRef, useCallback } from 'react';
import { cn, isEqual } from '@/lib/utils';
import { useMPIFStore } from '@/store/mpifStore';

interface ValidationError {
  field: string;
  message: string;
  section: string;
}

interface SynthesisDetailsFormProps {
  data: SynthesisDetails;
  onSave: (data: SynthesisDetails) => void;
  onUnsavedChange: () => void;
  errors?: ValidationError[];
}

export function SynthesisDetailsForm({ data, onSave, onUnsavedChange, errors = [] }: SynthesisDetailsFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const lastSavedRef = useRef<SynthesisDetails>(data);
  const { dashboard } = useMPIFStore();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors: formErrors, isDirty },
    getValues,
    reset,
    watch,
  } = useForm<SynthesisDetails>({
    defaultValues: {
      ...data,
      catalysts: data?.catalysts ?? [],
      substrates: data?.substrates ?? [{ id: '1', name: '', amount: undefined, amountUnit: '' }],
      solvents: data?.solvents ?? [{ id: '1', name: '', amount: undefined, amountUnit: '' }],
      vessels: data?.vessels ?? [{ id: '1', volume: undefined, volumeUnit: '', material: '', type: '', purpose: '' }],
      hardware: data?.hardware ?? [{ id: '1', purpose: '', generalName: '' }],
      steps: data?.steps ?? [{ id: '1', type: '', atmosphere: '', detail: '' }],
      procedureFull: data?.procedureFull ?? ''
    } as SynthesisDetails
  });

  const { fields: substrateFields, append: appendSubstrate, remove: removeSubstrate } = useFieldArray({
    control,
    name: 'substrates'
  });

  const { fields: solventFields, append: appendSolvent, remove: removeSolvent } = useFieldArray({
    control,
    name: 'solvents'
  });

  const { fields: catalystFields, append: appendCatalyst, remove: removeCatalyst } = useFieldArray({
    control,
    name: 'catalysts'
  });

  const { fields: vesselFields, append: appendVessel, remove: removeVessel } = useFieldArray({
    control,
    name: 'vessels'
  });


  const { fields: hardwareFields, append: appendHardware, remove: removeHardware } = useFieldArray({
    control,
    name: 'hardware'
  });



  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({
    control,
    name: 'steps'
  });

  // Helper function to check if a field has validation errors
  const hasValidationError = (fieldName: string) => {
    return errors.some(error => error.field === fieldName);
  };

  const withSequentialIds = useCallback((values: SynthesisDetails): SynthesisDetails => ({
    ...values,
    substrates: values.substrates.map((item, index) => ({ ...item, id: `R${index + 1}` })),
    solvents: values.solvents.map((item, index) => ({ ...item, id: `S${index + 1}` })),
    catalysts: (values.catalysts ?? []).map((item, index) => ({ ...item, id: `C${index + 1}` })),
    vessels: values.vessels.map((item, index) => ({ ...item, id: `V${index + 1}` })),
    hardware: values.hardware.map((item, index) => ({ ...item, id: `H${index + 1}` })),
    steps: values.steps.map((item, index) => ({ ...item, id: `P${index + 1}` })),
  }), []);

  const onSubmit = (formData: SynthesisDetails) => {
    onSave(withSequentialIds(formData));
  };

  // Track last saved data reference
  useEffect(() => {
    lastSavedRef.current = data;
  }, [data]);

  // Reset form when incoming data meaningfully changes and the form is not focused
  useEffect(() => {
    const activeElement = document.activeElement as HTMLElement | null;
    const formHasFocus = !!(formRef.current && activeElement && formRef.current.contains(activeElement));
    const currentValues = getValues();

    if (!isEqual(currentValues, data) && !formHasFocus) {
      reset({
        ...data,
        catalysts: data.catalysts ?? [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, reset, getValues, isEqual]);

  const saveIfChanged = useCallback(() => {
    const current = withSequentialIds(getValues());
    if (!isEqual(current, lastSavedRef.current)) {
      onUnsavedChange();
      onSave(current);
    }
  }, [getValues, isEqual, onSave, onUnsavedChange, withSequentialIds]);

  const watchedFields = watch();

  // Debounced autosave keeps the store current while the user is editing.
  useEffect(() => {
    if (!isDirty) return;
    const timeoutId = setTimeout(() => {
      saveIfChanged();
    }, 600);
    return () => clearTimeout(timeoutId);
  }, [isDirty, watchedFields, saveIfChanged]);

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-6" onBlurCapture={(e) => {
      const related = e.relatedTarget as HTMLElement | null;
      // If focus moved outside the form, attempt to save
      if (formRef.current && (!related || !formRef.current.contains(related))) {
        setTimeout(() => saveIfChanged(), 0);
      }
    }}>
      <div className={cn('grid gap-6', (dashboard as any).columnLayout === 'double' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1')}>
      {/* Substrates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Substrates
            <Button
              type="button"
              size="sm"
              onClick={() => appendSubstrate({ id: `R${substrateFields.length + 1}`, name: '', amount: undefined as any, amountUnit: '' })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Substrate
            </Button>
          </CardTitle>
          <CardDescription>
            Raw materials and reactants used in the synthesis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {substrateFields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-lg space-y-4">
              {/* First Row: ID, Name, Molarity, Molarity Unit */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>ID</Label>
                  <Input value={`R${index + 1}`} disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`substrates.${index}.name`}>Name *</Label>
                  <Input
                    {...register(`substrates.${index}.name`, { required: 'Name is required' })}
                    className={cn(hasValidationError(`substrates[${index}].name`) && "border-red-500 ring-red-500")}
                  />
                  {formErrors.substrates?.[index]?.name && (
                    <p className="text-sm text-red-600">{formErrors.substrates[index]?.name?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`substrates.${index}.molarity`}>Molarity</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    {...register(`substrates.${index}.molarity`, { valueAsNumber: true, min: { value: 0, message: 'Must be positive' } })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`substrates.${index}.molarityUnit`}>Molarity Unit</Label>
                  <Controller
                    name={`substrates.${index}.molarityUnit`}
                    control={control}
                    render={({ field }) => (
                      <EditableSelect
                        {...field}
                        value={field.value || ''}
                        options={['μmol', 'mmol', 'mol', 'kmol']}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Second Row: Amount, Unit, Supplier */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`substrates.${index}.amount`}>Amount *</Label>
                  <Input
                    type="number"
                    step="0.001"
                    {...register(`substrates.${index}.amount`, {
                      required: 'Amount is required',
                      valueAsNumber: true,
                      min: { value: 0, message: 'Amount must be positive' }
                    })}
                    className={cn(hasValidationError(`substrates[${index}].amount`) && "border-red-500 ring-red-500")}
                  />
                  {formErrors.substrates?.[index]?.amount && (
                    <p className="text-sm text-red-600">{formErrors.substrates[index]?.amount?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`substrates.${index}.amountUnit`}>Unit *</Label>
                  <Controller
                    name={`substrates.${index}.amountUnit`}
                    control={control}
                    rules={{ required: 'Unit is required' }}
                    render={({ field }) => (
                      <EditableSelect
                        {...field}
                        options={['mg', 'g', 'kg', 'μL', 'mL', 'L']}
                        className={cn(hasValidationError(`substrates[${index}].amountUnit`) && "border-red-500 ring-red-500")}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`substrates.${index}.supplier`}>Supplier</Label>
                  <Input
                    {...register(`substrates.${index}.supplier`)}
                  />
                </div>

                {/* Empty column for alignment */}
                <div></div>
              </div>

              {/* Third Row: Purity, CAS, SMILES, Delete Button */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`substrates.${index}.purity`}>Purity (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...register(`substrates.${index}.purity`, { valueAsNumber: true, min: { value: 0, message: '>= 0' }, max: { value: 100, message: '<= 100' } })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`substrates.${index}.casNumber`}>CAS</Label>
                  <Input
                    {...register(`substrates.${index}.casNumber`)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`substrates.${index}.smiles`}>SMILES</Label>
                  <Input
                    {...register(`substrates.${index}.smiles`)}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeSubstrate(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Solvents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Solvents
            <Button
              type="button"
              size="sm"
              onClick={() => appendSolvent({ id: `S${solventFields.length + 1}`, name: '', amount: undefined as any, amountUnit: '' })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Solvent
            </Button>
          </CardTitle>
          <CardDescription>
            Solvents and reaction media
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {solventFields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-lg space-y-4">
              {/* First Row: ID, Name, Molarity, Molarity Unit */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>ID</Label>
                  <Input value={`S${index + 1}`} disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`solvents.${index}.name`}>Name *</Label>
                  <Input
                    {...register(`solvents.${index}.name`, { required: 'Name is required' })}
                    className={cn(hasValidationError(`solvents[${index}].name`) && "border-red-500 ring-red-500")}
                  />
                  {formErrors.solvents?.[index]?.name && (
                    <p className="text-sm text-red-600">{formErrors.solvents[index]?.name?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`solvents.${index}.molarity`}>Molarity</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    {...register(`solvents.${index}.molarity`, { valueAsNumber: true, min: { value: 0, message: 'Must be positive' } })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`solvents.${index}.molarityUnit`}>Molarity Unit</Label>
                  <Controller
                    name={`solvents.${index}.molarityUnit`}
                    control={control}
                    render={({ field }) => (
                      <EditableSelect
                        {...field}
                        value={field.value || ''}
                        options={['μmol', 'mmol', 'mol', 'kmol']}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Second Row: Amount, Unit, Supplier */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`solvents.${index}.amount`}>Amount *</Label>
                  <Input
                    type="number"
                    step="0.001"
                    {...register(`solvents.${index}.amount`, {
                      required: 'Amount is required',
                      valueAsNumber: true,
                      min: { value: 0, message: 'Amount must be positive' }
                    })}
                    className={cn(hasValidationError(`solvents[${index}].amount`) && "border-red-500 ring-red-500")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`solvents.${index}.amountUnit`}>Unit *</Label>
                  <Controller
                    name={`solvents.${index}.amountUnit`}
                    control={control}
                    rules={{ required: 'Unit is required' }}
                    render={({ field }) => (
                      <EditableSelect
                        {...field}
                        options={['μL', 'mL', 'L', 'mg', 'g', 'kg']}
                        className={cn(hasValidationError(`solvents[${index}].amountUnit`) && "border-red-500 ring-red-500")}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`solvents.${index}.supplier`}>Supplier</Label>
                  <Input
                    {...register(`solvents.${index}.supplier`)}
                  />
                </div>

                {/* Empty column for alignment */}
                <div></div>
              </div>

              {/* Third Row: Purity, CAS, SMILES, Delete Button */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`solvents.${index}.purity`}>Purity (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...register(`solvents.${index}.purity`, { valueAsNumber: true, min: { value: 0, message: '>= 0' }, max: { value: 100, message: '<= 100' } })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`solvents.${index}.casNumber`}>CAS</Label>
                  <Input
                    {...register(`solvents.${index}.casNumber`)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`solvents.${index}.smiles`}>SMILES</Label>
                  <Input
                    {...register(`solvents.${index}.smiles`)}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeSolvent(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Catalysts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Catalysts
            <Button
              type="button"
              size="sm"
              onClick={() => appendCatalyst({ id: `C${catalystFields.length + 1}`, name: '', amount: undefined as any, unit: '' })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Catalyst
            </Button>
          </CardTitle>
          <CardDescription>
            Catalysts used in the synthesis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {catalystFields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>ID</Label>
                  <Input value={`C${index + 1}`} disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`catalysts.${index}.name`}>Name *</Label>
                  <Input
                    {...register(`catalysts.${index}.name`, { required: 'Name is required' })}
                    className={cn(hasValidationError(`catalysts[${index}].name`) && "border-red-500 ring-red-500")}
                  />
                  {formErrors.catalysts?.[index]?.name && (
                    <p className="text-sm text-red-600">{formErrors.catalysts[index]?.name?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`catalysts.${index}.amount`}>Amount *</Label>
                  <Input
                    type="number"
                    step="0.001"
                    {...register(`catalysts.${index}.amount`, {
                      required: 'Amount is required',
                      valueAsNumber: true,
                      min: { value: 0, message: 'Amount must be positive' }
                    })}
                    className={cn(hasValidationError(`catalysts[${index}].amount`) && "border-red-500 ring-red-500")}
                  />
                  {formErrors.catalysts?.[index]?.amount && (
                    <p className="text-sm text-red-600">{formErrors.catalysts[index]?.amount?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`catalysts.${index}.unit`}>Unit *</Label>
                  <Controller
                    name={`catalysts.${index}.unit`}
                    control={control}
                    rules={{ required: 'Unit is required' }}
                    render={({ field }) => (
                      <EditableSelect
                        {...field}
                        options={['mg', 'g', 'kg', 'μL', 'mL', 'L', 'mol%', 'wt%']}
                        className={cn(hasValidationError(`catalysts[${index}].unit`) && "border-red-500 ring-red-500")}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`catalysts.${index}.supplier`}>Supplier</Label>
                  <Input
                    {...register(`catalysts.${index}.supplier`)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`catalysts.${index}.purity`}>Purity (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...register(`catalysts.${index}.purity`, { valueAsNumber: true, min: { value: 0, message: '>= 0' }, max: { value: 100, message: '<= 100' } })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`catalysts.${index}.casNumber`}>CAS</Label>
                  <Input
                    {...register(`catalysts.${index}.casNumber`)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`catalysts.${index}.smiles`}>SMILES</Label>
                  <Input
                    {...register(`catalysts.${index}.smiles`)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor={`catalysts.${index}.note`}>Note</Label>
                  <Input
                    {...register(`catalysts.${index}.note`)}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeCatalyst(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Vessels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Vessels
            <Button
              type="button"
              size="sm"
              onClick={() => appendVessel({
                id: `V${vesselFields.length + 1}`,
                volume: undefined as any,
                volumeUnit: '',
                material: '',
                type: '',
                purpose: ''
              })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Vessel
            </Button>
          </CardTitle>
          <CardDescription>
            Reaction vessels and containers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {vesselFields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>ID</Label>
                  <Input value={`V${index + 1}`} disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`vessels.${index}.type`}>Type *</Label>
                  <Controller
                    name={`vessels.${index}.type`}
                    control={control}
                    rules={{ required: 'Type is required' }}
                    render={({ field }) => (
                      <EditableSelect
                        {...field}
                        options={['Vial', 'Jar', 'Autoclave', 'Beaker', 'Flask', 'Centrifuge-tube']}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`vessels.${index}.volume`}>Volume *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    {...register(`vessels.${index}.volume`, {
                      required: 'Volume is required',
                      valueAsNumber: true,
                      min: { value: 0, message: 'Volume must be positive' }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`vessels.${index}.volumeUnit`}>Unit *</Label>
                  <Controller
                    name={`vessels.${index}.volumeUnit`}
                    control={control}
                    rules={{ required: 'Unit is required' }}
                    render={({ field }) => (
                      <EditableSelect
                        {...field}
                        options={['μL', 'mL', 'L']}
                      />
                    )}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`vessels.${index}.material`}>Material *</Label>
                  <Input
                    {...register(`vessels.${index}.material`, { required: 'Material is required' })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`vessels.${index}.purpose`}>Purpose *</Label>
                  <Controller
                    name={`vessels.${index}.purpose`}
                    control={control}
                    rules={{ required: 'Purpose is required' }}
                    render={({ field }) => (
                      <EditableSelect
                        {...field}
                        options={['Storing', 'Reaction']}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`vessels.${index}.supplier`}>Supplier</Label>
                  <Input
                    {...register(`vessels.${index}.supplier`)}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeVessel(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`vessels.${index}.note`}>Note</Label>
                <Input
                  {...register(`vessels.${index}.note`)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Hardware */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Hardware
            <Button
              type="button"
              size="sm"
              onClick={() => appendHardware({ id: `H${hardwareFields.length + 1}`, purpose: '', generalName: '', productName: '', supplier: '', note: '' })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Hardware
            </Button>
          </CardTitle>
          <CardDescription>
            Equipment and devices used during synthesis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hardwareFields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-lg space-y-4">
              {/* First Row: ID, Purpose, General Name, Delete Button */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>ID</Label>
                  <Input value={`H${index + 1}`} disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`hardware.${index}.purpose`}>Purpose *</Label>
                  <Controller
                    name={`hardware.${index}.purpose`}
                    control={control}
                    rules={{ required: 'Purpose is required' }}
                    render={({ field }) => (
                      <EditableSelect
                        {...field}
                        options={[
                          'Heating/Cooling',
                          'Atmosphere-control',
                          'Stirring/Mixing',
                          'Synthesis-devise',
                          'Transferring',
                          'Separation',
                          'Drying'
                        ]}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`hardware.${index}.generalName`}>General Name *</Label>
                  <Input
                    {...register(`hardware.${index}.generalName`, { required: 'General name is required' })}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeHardware(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Second Row: Product Name, Supplier */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`hardware.${index}.productName`}>Product Name</Label>
                  <Input
                    {...register(`hardware.${index}.productName`)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`hardware.${index}.supplier`}>Supplier</Label>
                  <Input
                    {...register(`hardware.${index}.supplier`)}
                  />
                </div>
              </div>

              {/* Third Row: Note */}
              <div className="space-y-2">
                <Label htmlFor={`hardware.${index}.note`}>Note</Label>
                <Input
                  {...register(`hardware.${index}.note`)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Procedure Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Procedure Steps
            <Button
              type="button"
              size="sm"
              onClick={() => appendStep({ id: `P${stepFields.length + 1}`, type: '', atmosphere: '', detail: '' })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Step
            </Button>
          </CardTitle>
          <CardDescription>
            Detailed synthesis procedure steps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stepFields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor={`steps.${index}.type`}>Step Type *</Label>
                <Controller
                  name={`steps.${index}.type`}
                  control={control}
                  rules={{ required: 'Type is required' }}
                  render={({ field }) => (
                    <EditableSelect
                      {...field}
                      options={['Preparation', 'Reaction', 'Work-up']}
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`steps.${index}.atmosphere`}>Atmosphere *</Label>
                <Controller
                  name={`steps.${index}.atmosphere`}
                  control={control}
                  rules={{ required: 'Atmosphere is required' }}
                  render={({ field }) => (
                    <EditableSelect
                      {...field}
                      options={['Air', 'Dry', 'Inert', 'Vacuum']}
                    />
                  )}
                />
              </div>

              <div className="flex items-end">
                {stepFields.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeStep(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2 md:col-span-3">
                <Label htmlFor={`steps.${index}.detail`}>Step Details *</Label>
                <textarea
                  {...register(`steps.${index}.detail`, { required: 'Details are required' })}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {formErrors.steps?.[index]?.detail && (
                  <p className="text-sm text-red-600">{formErrors.steps[index]?.detail?.message}</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Full Procedure */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Procedure</CardTitle>
          <CardDescription>
            Full synthesis procedure as a continuous text
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="procedureFull">Full Procedure</Label>
            <textarea
              id="procedureFull"
              {...register('procedureFull')}
              className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Complete procedure description in paragraph form
            </p>
          </div>
        </CardContent>
      </Card>
      </div>

      <div className="flex justify-end space-x-2">
        {/* <Button type="submit" disabled={!isDirty}>
          Save Synthesis Details
        </Button> */}
      </div>
    </form>
  );
}
