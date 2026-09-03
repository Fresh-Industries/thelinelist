"use client";

import dynamic from "next/dynamic";
import { Component, type ErrorInfo, type ReactNode } from "react";
import type { PackageFrontText } from "@/lib/sourcing/types";
import type { BottleFinish, PackagingType } from "./package-config";
import { StaticPackagePreview } from "./StaticPackagePreview";

export type ProductMockupProps = {
  packagingType: PackagingType;
  logoUrl?: string;
  logoAspect?: number;
  baseColor?: string;
  labelColor?: string;
  bottleFinish?: BottleFinish;
  logoScale?: number;
  logoPosition?: { x: number; y: number };
  frontText?: PackageFrontText | null;
  windowScale?: number;
  sceneKey?: number;
  variant?: "studio" | "thumbnail";
  onCaptureReady?: (capture: () => Promise<Blob | null>) => void;
};

const ProductMockupCanvas = dynamic(() => import("./ProductMockupCanvas"), {
  ssr: false,
  loading: () => (
    <div className="product-mockup-loading" role="status">
      <span aria-hidden="true" />
      Warming up the studio…
    </div>
  ),
});

export function ProductMockup(props: ProductMockupProps) {
  const resetKey = `${props.packagingType}:${props.sceneKey ?? 0}:${props.logoUrl ?? ""}`;
  return (
    <div className="product-mockup" data-packaging-type={props.packagingType} data-preview-variant={props.variant ?? "studio"}>
      <ProductMockupErrorBoundary resetKey={resetKey} fallback={<StaticPackagePreview {...props} />}>
        <ProductMockupCanvas {...props} />
      </ProductMockupErrorBoundary>
    </div>
  );
}

class ProductMockupErrorBoundary extends Component<{
  children: ReactNode;
  fallback: ReactNode;
  resetKey: string;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // The labeled 2D preview is the deliberate recovery path.
  }

  componentDidUpdate(previous: Readonly<{ resetKey: string }>): void {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
