import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Send, CheckCircle2, Store } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  requestDate: z.string().nonempty("Request date is required"),
  kamName: z.string().trim().min(1, "KAM name is required").max(100),
  brandName: z.string().trim().min(1, "Brand name is required").max(100),
  vendorName: z.string().trim().min(1, "Vendor name is required").max(100),
  sisType: z.enum(["Standard", "Vanilla", "Customized"], {
    required_error: "Please select an SIS type",
  }),
  retoolLink: z.string().url("Please enter a valid URL").or(z.literal("")),
  goLiveDate: z.string().nonempty("Go-live date is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function SISRequestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [brandLogo, setBrandLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const sisType = watch("sisType");

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB");
        return;
      }
      setBrandLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!brandLogo) {
      toast.error("Please upload a brand logo");
      return;
    }

    setIsSubmitting(true);
    console.log("Starting form submission...", data);

    try {
      console.log("Uploading logo to Firebase Storage (resumable)...");
      const logoRef = ref(storage, `brand-logos/${Date.now()}_${brandLogo.name}`);

      const logoUrl: string = await new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(logoRef, brandLogo);
        const timeout = setTimeout(() => {
          try { uploadTask.cancel(); } catch {}
          reject(new Error("Upload timed out"));
        }, 25000);

        uploadTask.on(
          "state_changed",
          undefined,
          (error) => {
            clearTimeout(timeout);
            reject(error);
          },
          async () => {
            clearTimeout(timeout);
            try {
              const url = await getDownloadURL(logoRef);
              resolve(url);
            } catch (e) {
              reject(e);
            }
          }
        );
      });

      console.log("Logo uploaded successfully:", logoUrl);
      console.log("Saving to Firestore...");

      const docRef = await addDoc(collection(db, "sisRequests"), {
        email: data.email,
        requestDate: data.requestDate,
        kamName: data.kamName,
        brandName: data.brandName,
        vendorName: data.vendorName,
        sisType: data.sisType,
        retoolLink: data.retoolLink,
        goLiveDate: data.goLiveDate,
        logoUrl,
        createdAt: new Date().toISOString(),
      });

      console.log("Document written with ID: ", docRef.id);
      setIsSubmitted(true);
      toast.success("Request submitted successfully! Check your email for confirmation.");

      setTimeout(() => {
        reset();
        setBrandLogo(null);
        setLogoPreview("");
        setIsSubmitted(false);
      }, 3000);
    } catch (error: any) {
      console.error("Submission error details:", error);
      const code = error?.code as string | undefined;
      const message = error?.message as string | undefined;

      let friendly = message || "Failed to submit request. Please try again.";
      if (code?.includes("storage/unauthorized")) {
        friendly = "Upload blocked by Storage rules. Please allow uploads for this bucket (brand-logos/*) or sign in.";
      } else if (code?.includes("storage/quota-exceeded")) {
        friendly = "Storage quota exceeded for the bucket.";
      } else if (message?.toLowerCase().includes("timed out")) {
        friendly = "Upload timed out. Please check your network or Storage CORS/rules.";
      }

      toast.error(`Submission failed: ${friendly}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <Card className="w-full max-w-md text-center shadow-[var(--shadow-strong)] border-primary/20">
          <CardContent className="pt-16 pb-12">
            <div className="mb-6 flex justify-center">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-[var(--shadow-medium)] animate-scale-in">
                <CheckCircle2 className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Request Submitted!
            </h2>
            <p className="text-muted-foreground text-lg">
              Your Shop in Shop request has been successfully submitted to the Jumia Onsite team. You will receive a confirmation email shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <Card className="w-full max-w-3xl shadow-[var(--shadow-strong)] border-primary/20 animate-fade-in">
        <CardHeader className="space-y-4 pb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/10">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-[var(--shadow-soft)]">
              <Store className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-3xl md:text-4xl font-bold text-primary">
                Shop in Shop Request Form
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Jumia Onsite Team</p>
            </div>
          </div>
          <CardDescription className="text-base">
            Submit your Shop in Shop request. All fields are required for processing.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@company.com"
                  {...register("email")}
                  className="transition-all duration-300 focus:shadow-[var(--shadow-soft)]"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Date of Request */}
              <div className="space-y-2">
                <Label htmlFor="requestDate">Date of Request</Label>
                <Input
                  id="requestDate"
                  type="date"
                  {...register("requestDate")}
                  className="transition-all duration-300 focus:shadow-[var(--shadow-soft)]"
                />
                {errors.requestDate && (
                  <p className="text-sm text-destructive">{errors.requestDate.message}</p>
                )}
              </div>

              {/* KAM Name */}
              <div className="space-y-2">
                <Label htmlFor="kamName">KAM Name</Label>
                <Input
                  id="kamName"
                  placeholder="Key Account Manager"
                  {...register("kamName")}
                  className="transition-all duration-300 focus:shadow-[var(--shadow-soft)]"
                />
                {errors.kamName && (
                  <p className="text-sm text-destructive">{errors.kamName.message}</p>
                )}
              </div>

              {/* Brand Name */}
              <div className="space-y-2">
                <Label htmlFor="brandName">Brand Name</Label>
                <Input
                  id="brandName"
                  placeholder="Brand name"
                  {...register("brandName")}
                  className="transition-all duration-300 focus:shadow-[var(--shadow-soft)]"
                />
                {errors.brandName && (
                  <p className="text-sm text-destructive">{errors.brandName.message}</p>
                )}
              </div>

              {/* Vendor Name */}
              <div className="space-y-2">
                <Label htmlFor="vendorName">Vendor Name</Label>
                <Input
                  id="vendorName"
                  placeholder="Vendor name"
                  {...register("vendorName")}
                  className="transition-all duration-300 focus:shadow-[var(--shadow-soft)]"
                />
                {errors.vendorName && (
                  <p className="text-sm text-destructive">{errors.vendorName.message}</p>
                )}
              </div>

              {/* SIS Type */}
              <div className="space-y-2">
                <Label htmlFor="sisType">SIS Type</Label>
                <Select
                  value={sisType}
                  onValueChange={(value) => setValue("sisType", value as any)}
                >
                  <SelectTrigger className="transition-all duration-300 focus:shadow-[var(--shadow-soft)]">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Vanilla">Vanilla</SelectItem>
                    <SelectItem value="Customized">Customized</SelectItem>
                  </SelectContent>
                </Select>
                {errors.sisType && (
                  <p className="text-sm text-destructive">{errors.sisType.message}</p>
                )}
              </div>

              {/* Retool Link */}
              <div className="space-y-2">
                <Label htmlFor="retoolLink">Retool Link</Label>
                <Input
                  id="retoolLink"
                  type="url"
                  placeholder="https://retool.com/..."
                  {...register("retoolLink")}
                  className="transition-all duration-300 focus:shadow-[var(--shadow-soft)]"
                />
                {errors.retoolLink && (
                  <p className="text-sm text-destructive">{errors.retoolLink.message}</p>
                )}
              </div>

              {/* Go-Live Date */}
              <div className="space-y-2">
                <Label htmlFor="goLiveDate">Date of Go-Live</Label>
                <Input
                  id="goLiveDate"
                  type="date"
                  {...register("goLiveDate")}
                  className="transition-all duration-300 focus:shadow-[var(--shadow-soft)]"
                />
                {errors.goLiveDate && (
                  <p className="text-sm text-destructive">{errors.goLiveDate.message}</p>
                )}
              </div>
            </div>

            {/* Brand Logo Upload */}
            <div className="space-y-3">
              <Label htmlFor="brandLogo">Brand Logo</Label>
              <div className="flex items-center gap-4">
                <label
                  htmlFor="brandLogo"
                  className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-border hover:border-primary rounded-lg cursor-pointer transition-all duration-300 hover:shadow-[var(--shadow-soft)]"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {brandLogo ? "Change Logo" : "Upload Logo"}
                  </span>
                  <input
                    id="brandLogo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {logoPreview && (
                  <div className="h-16 w-16 rounded-lg border-2 border-border overflow-hidden bg-muted">
                    <img
                      src={logoPreview}
                      alt="Brand logo preview"
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG or SVG (max. 5MB)
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 transition-all duration-300 shadow-[var(--shadow-medium)] hover:shadow-[var(--shadow-strong)] hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Submitting Request...
                </span>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Submit to Jumia Onsite Team
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
