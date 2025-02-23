import { useState } from 'react';
import { Play } from 'lucide-react';

const GithubEvaluation = () => {
  const [repoLink, setRepoLink] = useState('');
  const [evaluationResult, setEvaluationResult] = useState('');

  const handleEvaluate = () => {
    // Mock evaluation process
    if (repoLink.trim() === '') {
      setEvaluationResult('Please enter a valid GitHub link.');
      return;
    }

    setEvaluationResult('Evaluating repository...');
    setTimeout(() => {
      setEvaluationResult(`Evaluation complete for: ${repoLink}`);
    }, 2000);
  };

  return (
    <div className="space-y-4 bg-white p-4 rounded-lg shadow">
      <h5 className="text-lg font-semibold text-gray-800">GitHub Evaluation</h5>

      <input
        type="text"
        placeholder="Enter GitHub Repo Link"
        value={repoLink}
        onChange={(e) => setRepoLink(e.target.value)}
        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      <button
        onClick={handleEvaluate}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
      >
        <Play size={16} /> Evaluate
      </button>

      <textarea
        readOnly
        value={evaluationResult}
        placeholder="Evaluation results will appear here..."
        className="w-full h-32 p-2 border rounded-lg focus:outline-none bg-gray-100"
      />
    </div>
  );
};

export default GithubEvaluation;
