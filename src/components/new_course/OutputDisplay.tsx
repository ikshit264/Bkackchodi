const OutputDisplay = ({
  output,
  metadata,
}: {
  output: any;
  metadata: any;
}) => {

  const FilterByBatch = () =>{
    
  }

  return (
    <div className="mt-4 w-full max-w-4xl flex flex-col gap-4">
      <div>
        
      </div>
      <div>
        <h3 className="font-bold">JSON Output:</h3>
        <pre className="bg-gray-200 p-4 rounded text-black overflow-auto max-h-[600px] whitespace-pre-wrap">
          {JSON.stringify(output, null, 2)}
        </pre>
      </div>
      <div>
        <pre className="bg-gray-200 p-4 rounded text-black overflow-auto max-h-[600px] whitespace-pre-wrap">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default OutputDisplay;
