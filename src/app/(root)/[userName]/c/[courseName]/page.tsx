"use client"
import { getBatchesByUserNameandCourseName } from "../../../../../components/actions/batch";
import BatchCard from "../../../../../components/batch/card";
import WindowPathLogger from "./WindowPathLogger";
import type { Batch } from "../../../../../components/shared/schema/Project"; 
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Page() {
  const { userName, courseName } = useParams();
  console.log(userName, courseName);
  const [Batches, setBatches] = useState(null);

  useEffect(() => {
    const fetchBatches = async () => {
      const batches = await getBatchesByUserNameandCourseName(userName as string, courseName as string);
      setBatches(batches);
    };
    fetchBatches();
  }, [userName, courseName]); // Include `courseName` in the dependency array

  if (!Batches || !Batches.batch || Batches.batch.length === 0) {
    return (
      <div className="text-center text-red-500 text-lg">Batches not found</div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="flex flex-col justify-around items-center mb-8">
        <WindowPathLogger />
        <h1 className="text-7xl text-center font-bold">
          <span className="bg-gradient-to-r from-primary-500 to-secondary-500 text-transparent bg-clip-text inline-block border-b-4 border-primary-500">
            {Array.isArray(courseName)
              ? courseName.join(" ").replaceAll("_", " ").toUpperCase()
              : (courseName ?? "").replaceAll("_", " ").toUpperCase()}
          </span>
        </h1>
      </div>
      <div className="flex flex-wrap justify-center items-center gap-6">
      {Batches.batch
        .sort((a: Batch, b: Batch) => (a.number ?? 0) - (b.number ?? 0))
        .map((batch: Batch) => (
          <div
            key={batch.id}
            className="group relative p-6 rounded-2xl border border-gray-200 hover:shadow-glow transition-all duration-500 cursor-pointer"
          >
            {/* Background gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-2xl" />

            {/* BatchCard content */}
            <div className="relative z-10">
              <BatchCard batch={batch} />
            </div>
          </div>
        ))}
    </div>

    </div>
  );
}
