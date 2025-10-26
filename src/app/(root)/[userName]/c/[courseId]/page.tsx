"use client"
import { getBatchProjectsByCourseId } from "../../../../../components/actions/batch";
import BatchCard from "../../../../../components/batch/card";
import WindowPathLogger from "./WindowPathLogger";
import type { Batch } from "../../../../../components/shared/schema/Project"; 
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Page() {
  const { userName, courseId } = useParams();
  const [Batches, setBatches] = useState(null);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    const fetchBatches = async () => {
      const batches = await getBatchProjectsByCourseId(userName as string, courseId as string);
      setBatches(batches);
      setProjectName(batches.title);
    };
    fetchBatches();
  }, [userName, courseId]); // Include `courseId` in the dependency array

  if (!Batches || !Batches.batch || Batches.batch.length === 0) {
    return (
      <div className="text-center text-red-500 text-lg">Loading...</div>
    );
  }

  return (
    <div className="flex flex-col justify-around items-center min-h-screen bg-gray-100 p-4">
      <WindowPathLogger />
      <h1 className="text-black text-7xl">{projectName}</h1>
      <div className="flex flex-wrap justify-center items-center">
        {Batches.batch
          .sort((a: Batch, b: Batch) => (a.number ?? 0) - (b.number ?? 0))
          .map((batch: Batch) => (
            <BatchCard key={batch.id} batch={{...batch}} userId={userName as string}/>
          ))}
      </div>
    </div>
  );
}
