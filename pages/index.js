import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Line } from "react-chartjs-2";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const supabase = createClient("https://YOUR_PROJECT.supabase.co", "YOUR_PUBLIC_ANON_KEY");

export default function SkatteSkræddersyeren() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [income, setIncome] = useState(0);
  const [commuteKm, setCommuteKm] = useState(0);
  const [children, setChildren] = useState(0);
  const [pension, setPension] = useState(0);
  const [result, setResult] = useState("");
  const [history, setHistory] = useState([]);
  const [isPro, setIsPro] = useState(false);
  const pdfRef = useRef();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.email) {
        checkProStatus(session.user.email);
      }
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.email) {
        checkProStatus(session.user.email);
      }
    });
  }, []);

  const checkProStatus = async (email) => {
    const { data, error } = await supabase
      .from("brugere")
      .select("is_pro_user")
      .eq("email", email)
      .single();
    if (data?.is_pro_user) {
      setIsPro(true);
    }
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOtp({ email });
    alert("Tjek din mail for login-link.");
  };

  const handleAnalyze = async () => {
    let fradrag = 46000;
    if (commuteKm > 24) fradrag += (commuteKm - 24) * 2 * 2.19 * 220;
    if (children > 0) fradrag += children * 18500;
    if (pension > 0) fradrag += pension;

    const skat = income * 0.37 - fradrag;
    const skatEffektiv = skat > 0 ? skat : 0;

    const feedback = `
      Din beregnede effektive skat er ca. ${skatEffektiv.toFixed(0)} kr.
      Vi har taget højde for:
      - Standardfradrag: 46.000 kr
      - Befordringsfradrag: ${(commuteKm > 24 ? ((commuteKm - 24) * 2 * 2.19 * 220).toFixed(0) : 0)} kr
      - Børnefradrag: ${(children * 18500).toFixed(0)} kr
      - Pensionsindbetaling: ${pension.toFixed(0)} kr
    `;

    setResult(feedback);
    setHistory((prev) => [...prev, skatEffektiv]);

    if (session) {
      await supabase.from("beregninger").insert({
        user_id: session.user.id,
        indkomst: income,
        befordring: commuteKm,
        born: children,
        pension,
        resultat: skatEffektiv,
      });
    }
  };

  const handleDownloadPDF = async () => {
    const element = pdfRef.current;
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("skatteberegning.pdf");
  };

  const redirectToStripe = () => {
    window.location.href = "https://buy.stripe.com/test_00g8zWgCaa2xeWs6oo";
  };

  const chartData = {
    labels: history.map((_, i) => `Beregning ${i + 1}`),
    datasets: [
      {
        label: "Effektiv skat (kr)",
        data: history,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.5)",
      },
    ],
  };

  if (!session) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">Login til SkatteSkræddersyeren</h2>
        <Input
          type="email"
          placeholder="Indtast din email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button className="mt-4" onClick={handleLogin}>
          Send login-link
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">SkatteSkræddersyeren</h1>
      <Tabs defaultValue="beregner">
        <TabsList className="mb-4">
          <TabsTrigger value="beregner">Beregner</TabsTrigger>
          <TabsTrigger value="pro">Pro Visning</TabsTrigger>
        </TabsList>

        <TabsContent value="beregner">
          <Card className="mb-4">
            <CardContent className="space-y-4">
              <Input
                type="number"
                placeholder="Din årlige indkomst (kr)"
                value={income}
                onChange={(e) => setIncome(Number(e.target.value))}
              />
              <Input
                type="number"
                placeholder="Antal km til arbejde (én vej)"
                value={commuteKm}
                onChange={(e) => setCommuteKm(Number(e.target.value))}
              />
              <Input
                type="number"
                placeholder="Antal børn under 18 år"
                value={children}
                onChange={(e) => setChildren(Number(e.target.value))}
              />
              <Input
                type="number"
                placeholder="Pensionsindbetaling (kr)"
                value={pension}
                onChange={(e) => setPension(Number(e.target.value))}
              />
              <Button onClick={handleAnalyze}>Beregn skat</Button>
            </CardContent>
          </Card>
          {result && (
            <Card ref={pdfRef} className="mb-4">
              <CardContent>
                <Textarea className="w-full" rows={8} value={result} readOnly />
              </CardContent>
            </Card>
          )}
          {result && (
            <Button onClick={handleDownloadPDF}>Download PDF</Button>
          )}
        </TabsContent>

        <TabsContent value="pro">
          {isPro ? (
            <Card>
              <CardContent>
                <Line data={chartData} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <p className="mb-4">Denne funktion er kun for Pro-brugere.</p>
                <Button onClick={redirectToStripe}>Opgrader til Pro (29 kr/md)</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
