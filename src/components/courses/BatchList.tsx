// BatchList.tsx
import { ChevronDown, ChevronRight } from 'lucide-react';
import ProjectCard from './ProjectCard';

interface BatchListProps {
  batches: any[];
  expandedBatch: string | null;
  onBatchToggle: (batchId: string) => void;
  onStartProject: (projectId: string) => void;
}

const BatchList = ({ batches, expandedBatch, onBatchToggle, onStartProject }: BatchListProps) => {
  return (
    <div className="mt-6">
      <h3 className="text-xl font-bold mb-4 text-gray-700">Batches</h3>
      {batches && batches.length > 0 ? (
        batches.map((batch) => (
          <div
            key={batch.id}
            className="border rounded-lg p-4 mb-4 shadow hover:shadow-md transition bg-gray-50"
          >
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => onBatchToggle(batch.id)}
            >
              <h4 className="font-semibold text-lg text-gray-800">
                Batch Number: {batch.number}
              </h4>
              {expandedBatch === batch.id ? (
                <ChevronDown className="text-blue-500" />
              ) : (
                <ChevronRight className="text-blue-500" />
              )}
            </div>

            {expandedBatch === batch.id && (
              <div className="mt-3 space-y-3">
                {batch.projects && batch.projects.length > 0 ? (
                  batch.projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={{ ...project, batcId : batch.id }}
                      onStartProject={onStartProject}
                    />
                  ))
                ) : (
                  <p className="text-gray-500">No projects found.</p>
                )}
              </div>
            )}
          </div>
        ))
      ) : (
        <p className="text-gray-500">No batches found for this course.</p>
      )}
    </div>
  );
};

export default BatchList;