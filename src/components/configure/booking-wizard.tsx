"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/logo";
import { ProgressBar } from "@/components/configure/progress-bar";
import { LiveQuoteSidebar } from "@/components/configure/live-quote-sidebar";
import { StepScreen } from "@/components/configure/step-screen";
import { StepDates, type AvailabilityState } from "@/components/configure/step-dates";
import { StepServices } from "@/components/configure/step-services";
import { StepEventInfo } from "@/components/configure/step-event-info";
import { StepAccount } from "@/components/configure/step-account";
import { StepReview } from "@/components/configure/step-review";
import { computeConfigurator, type PricingBreakdown } from "@/lib/pricing";
import { initialWizardState, SIZE_PRESETS, type WizardState, type LedProduct, type Equipment, type Package } from "@/lib/wizard-types";
import Link from "next/link";

function daysBetween(a: string, b: string): number {
  if (!a || !b) return 1;
  const start = new Date(a);
  const end = new Date(b);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

export function BookingWizard({
  products,
  equipmentList,
  packagesList,
  initialProductSlug,
  initialPackageSlug,
}: {
  products: LedProduct[];
  equipmentList: Equipment[];
  packagesList: Package[];
  initialProductSlug?: string;
  initialPackageSlug?: string;
}) {
  const router = useRouter();
  const { status } = useSession();

  const [state, setState] = useState<WizardState>(() => {
    const s = initialWizardState();
    const pkg = initialPackageSlug ? packagesList.find((p) => p.slug === initialPackageSlug) : undefined;
    const productSlug = initialProductSlug ?? pkg?.screenTypeSuggestion ?? undefined;
    const product = productSlug ? products.find((p) => p.slug === productSlug) : undefined;
    if (product) s.ledProductId = product.id;
    else if (products[0]) s.ledProductId = products[0].id;
    if (pkg) s.packageId = pkg.id;
    return s;
  });

  const [breakdown, setBreakdown] = useState<PricingBreakdown | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityState>({
    checking: false,
    checked: false,
    available: null,
    availableCabinets: null,
  });
  const [bookingResult, setBookingResult] = useState<{ bookingNumber: string; action: string } | null>(null);

  const update = useCallback((patch: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const selectedProduct = useMemo(() => products.find((p) => p.id === state.ledProductId) ?? null, [products, state.ledProductId]);

  const widthM = state.sizeMode === "custom" ? parseFloat(state.customWidthM) || 0 : SIZE_PRESETS[state.presetIndex].w;
  const heightM = state.sizeMode === "custom" ? parseFloat(state.customHeightM) || 0 : SIZE_PRESETS[state.presetIndex].h;

  const configResult = useMemo(
    () =>
      computeConfigurator(
        widthM || 1,
        heightM || 1,
        selectedProduct?.cabinetWidthMm ?? 500,
        selectedProduct?.cabinetHeightMm ?? 500,
        selectedProduct ? Number(selectedProduct.pixelPitch) : 2.6
      ),
    [widthM, heightM, selectedProduct]
  );

  const rentalDays = useMemo(() => daysBetween(state.installationDate, state.dismantlingDate), [state.installationDate, state.dismantlingDate]);

  const isWeekend = useMemo(() => {
    if (!state.eventDate) return false;
    const d = new Date(state.eventDate).getDay();
    return d === 5 || d === 6; // Fri/Sat weekend (Gulf region)
  }, [state.eventDate]);

  // ---- Live quote fetching (debounced) ----
  const quoteDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!selectedProduct) return;
    // Sync a loading flag for the sidebar while the debounced quote request is in flight.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuoteLoading(true);
    if (quoteDebounce.current) clearTimeout(quoteDebounce.current);
    quoteDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pricePerCabinetPerDay: Number(selectedProduct.pricePerCabinetPerDay),
            totalCabinets: configResult.totalCabinets,
            rentalDays,
            includeInstallation: state.includeInstallation,
            includeDismantling: state.includeDismantling,
            includeTransport: state.includeTransport,
            includeProcessor: state.includeProcessor,
            includeTechnician: state.includeTechnician,
            addons: state.addons,
            isWeekend,
            isCorporate: false,
          }),
        });
        const data = await res.json();
        setBreakdown(data);
      } catch {
        // silent — sidebar shows skeleton
      } finally {
        setQuoteLoading(false);
      }
    }, 350);
    return () => {
      if (quoteDebounce.current) clearTimeout(quoteDebounce.current);
    };
  }, [selectedProduct, configResult.totalCabinets, rentalDays, state.includeInstallation, state.includeDismantling, state.includeTransport, state.includeProcessor, state.includeTechnician, state.addons, isWeekend]);

  // ---- Availability checking (debounced) ----
  const availDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!selectedProduct || !state.installationDate || !state.dismantlingDate) {
      // Reset the availability badge immediately when required fields are cleared.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailability({ checking: false, checked: false, available: null, availableCabinets: null });
      return;
    }
    setAvailability((prev) => ({ ...prev, checking: true }));
    if (availDebounce.current) clearTimeout(availDebounce.current);
    availDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ledProductId: selectedProduct.id,
            requiredCabinets: configResult.totalCabinets,
            installationDate: state.installationDate,
            dismantlingDate: state.dismantlingDate,
          }),
        });
        const data = await res.json();
        setAvailability({
          checking: false,
          checked: true,
          available: data.available ?? null,
          availableCabinets: data.availableCabinets ?? null,
        });
      } catch {
        setAvailability({ checking: false, checked: false, available: null, availableCabinets: null });
      }
    }, 400);
    return () => {
      if (availDebounce.current) clearTimeout(availDebounce.current);
    };
  }, [selectedProduct, configResult.totalCabinets, state.installationDate, state.dismantlingDate]);

  function goNext() {
    if (state.step === 1 && !state.ledProductId) {
      toast.error("Please select a screen to continue.");
      return;
    }
    if (state.step === 2) {
      if (!state.eventDate || !state.installationDate || !state.dismantlingDate) {
        toast.error("Please select your event, installation and dismantling dates.");
        return;
      }
      if (availability.available === false) {
        toast.error("This screen isn't available for your selected dates. Try adjusting your dates or size.");
        return;
      }
    }
    if (state.step === 4) {
      if (!state.eventName || !state.venueName || !state.venueAddress) {
        toast.error("Please fill in event name, venue name and venue address.");
        return;
      }
      // Skip account step if already signed in
      if (status === "authenticated") {
        update({ step: 6 });
        return;
      }
    }
    update({ step: Math.min(6, state.step + 1) });
  }

  function goBack() {
    if (state.step === 6 && status === "authenticated") {
      update({ step: 4 });
      return;
    }
    update({ step: Math.max(1, state.step - 1) });
  }

  async function handleSubmit(action: "confirmed" | "quotation_requested" | "draft") {
    if (!selectedProduct) return;
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ledProductId: selectedProduct.id,
          packageId: state.packageId,
          screenType: selectedProduct.screenType,
          pixelPitch: Number(selectedProduct.pixelPitch),
          widthM: configResult.widthM,
          heightM: configResult.heightM,
          totalCabinets: configResult.totalCabinets,
          areaM2: configResult.areaM2,
          aspectRatio: configResult.aspectRatio,
          resolutionEstimate: configResult.resolutionEstimate,

          eventDate: state.eventDate,
          installationDate: state.installationDate,
          installationTime: state.installationTime,
          eventStartTime: state.eventStartTime,
          eventEndTime: state.eventEndTime,
          dismantlingDate: state.dismantlingDate,
          dismantlingTime: state.dismantlingTime,
          rentalDays,

          eventName: state.eventName,
          eventType: state.eventType,
          venueName: state.venueName,
          venueAddress: state.venueAddress,
          indoorOutdoor: state.indoorOutdoor,
          additionalNotes: state.additionalNotes,

          includeInstallation: state.includeInstallation,
          includeDismantling: state.includeDismantling,
          includeTransport: state.includeTransport,
          includeProcessor: state.includeProcessor,
          includeTechnician: state.includeTechnician,

          addons: state.addons,
          documents: state.documents,

          pricePerCabinetPerDay: Number(selectedProduct.pricePerCabinetPerDay),
          isWeekend,
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setBookingResult({ bookingNumber: data.booking.bookingNumber, action });
      toast.success("Booking submitted successfully!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  if (bookingResult) {
    return <ConfirmationScreen bookingNumber={bookingResult.bookingNumber} action={bookingResult.action} router={router} />;
  }

  return (
    <div className="min-h-screen">
      <header className="glass-strong sticky top-0 z-40 border-b border-white/5">
        <Container className="flex h-16 items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <div className="hidden sm:block">
            <ProgressBar current={state.step} />
          </div>
        </Container>
        <div className="sm:hidden px-6 pb-3">
          <ProgressBar current={state.step} />
        </div>
      </header>

      <Container className="grid gap-10 py-10 lg:grid-cols-[1fr_360px] lg:py-14">
        <div>
          {state.step === 1 && <StepScreen products={products} state={state} update={update} />}
          {state.step === 2 && <StepDates state={state} update={update} rentalDays={rentalDays} availability={availability} />}
          {state.step === 3 && <StepServices equipment={equipmentList} state={state} update={update} />}
          {state.step === 4 && <StepEventInfo state={state} update={update} />}
          {state.step === 5 && <StepAccount onAuthenticated={() => update({ step: 6 })} />}
          {state.step === 6 && (
            <StepReview
              state={state}
              product={selectedProduct}
              equipment={equipmentList}
              breakdown={breakdown}
              rentalDays={rentalDays}
              totalCabinets={configResult.totalCabinets}
              widthM={configResult.widthM}
              heightM={configResult.heightM}
              onSubmit={handleSubmit}
            />
          )}

          {state.step < 6 && (
            <div className="mt-10 flex items-center justify-between border-t border-border pt-8">
              <Button variant="ghost" onClick={goBack} disabled={state.step === 1}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={goNext}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          {state.step === 6 && (
            <div className="mt-6">
              <Button variant="ghost" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          )}
        </div>

        <div className="hidden lg:block">
          <LiveQuoteSidebar
            product={selectedProduct}
            widthM={configResult.widthM}
            heightM={configResult.heightM}
            totalCabinets={configResult.totalCabinets}
            rentalDays={rentalDays}
            breakdown={breakdown}
            loading={quoteLoading}
          />
        </div>

        {/* Mobile quote summary */}
        <div className="lg:hidden">
          <LiveQuoteSidebar
            product={selectedProduct}
            widthM={configResult.widthM}
            heightM={configResult.heightM}
            totalCabinets={configResult.totalCabinets}
            rentalDays={rentalDays}
            breakdown={breakdown}
            loading={quoteLoading}
          />
        </div>
      </Container>
    </div>
  );
}

function ConfirmationScreen({
  bookingNumber,
  action,
  router,
}: {
  bookingNumber: string;
  action: string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center py-20">
      <Container className="max-w-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
          <PartyPopper className="h-8 w-8" />
        </div>
        <h1 className="font-display mt-8 text-3xl font-semibold tracking-tight">
          {action === "confirmed" ? "Booking Confirmed!" : action === "quotation_requested" ? "Quotation Requested!" : "Saved for Later"}
        </h1>
        <p className="mt-3 text-muted">
          Your booking reference is <span className="font-semibold text-foreground">{bookingNumber}</span>. We&apos;ve saved everything to
          your customer portal.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => router.push("/portal/bookings")} size="lg">
            View My Bookings
          </Button>
          <Button onClick={() => router.push("/")} variant="outline" size="lg">
            Return Home
          </Button>
        </div>
      </Container>
    </div>
  );
}
