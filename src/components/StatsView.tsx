import React, { useContext, useMemo } from 'react';
import { WatchedDataContext } from '../App';
import { ManagedWatchedItem, Rating, MediaType } from '../types';

// Estilos para cada tipo de avaliação
const ratingStyles: Record<Rating, { color: string, name: string }> = {
    amei: { color: '#4ade80', name: 'Amei' },       // green-400
    gostei: { color: '#818cf8', name: 'Gostei' },    // indigo-400
    meh: { color: '#facc15', name: 'Meh' },         // yellow-400
    naoGostei: { color: '#f87171', name: 'Não Gostei' } // red-400
};

// Componente para o gráfico de pizza
const PieChart = ({ data }: { data: Record<Rating, number> }) => {
    const total = Object.values(data).reduce((acc, val) => acc + val, 0);
    if (total === 0) return <div className="h-48 w-48 bg-gray-700 rounded-full flex items-center justify-center"><span className="text-gray-500">Sem dados</span></div>;

    let cumulativePercent = 0;
    const slices = (Object.keys(data) as Rating[]).map(key => {
        const value = data[key];
        const percent = value / total;
        const startAngle = cumulativePercent * 2 * Math.PI;
        cumulativePercent += percent;
        const endAngle = cumulativePercent * 2 * Math.PI;
        
        const r = 90;
        const x1 = r * Math.cos(startAngle);
        const y1 = r * Math.sin(startAngle);
        const x2 = r * Math.cos(endAngle);
        const y2 = r * Math.sin(endAngle);

        const largeArcFlag = percent > 0.5 ? 1 : 0;

        const pathData = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} L 0 0 Z`;
        
        return { pathData, color: ratingStyles[key].color };
    });

    return (
        <svg viewBox="-100 -100 200 200" className="w-48 h-48 transform -rotate-90">
            {slices.map((slice, index) => (
                <path key={index} d={slice.pathData} fill={slice.color} />
            ))}
        </svg>
    );
};

// Componente para o gráfico de barras
const BarChart = ({ data }: { data: { genre: string, count: number }[] }) => {
    if (data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-gray-500">Adicione itens à lista 'Amei' para ver seus gêneros favoritos.</div>;
    }
    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="w-full space-y-3">
            {data.map(({ genre, count }) => (
                <div key={genre} className="flex items-center gap-4 text-sm">
                    <span className="w-32 truncate text-gray-400 text-right">{genre}</span>
                    <div className="flex-1 bg-gray-700 rounded-full h-8 flex items-center">
                        <div 
                            className="bg-indigo-500 h-full rounded-full flex items-center justify-end px-2"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                        >
                            <span className="font-bold text-white text-xs">{count}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};


const StatsView: React.FC = () => {
  const { data } = useContext(WatchedDataContext);

  // Calcula as estatísticas. As correções de tipo foram aplicadas aqui.
  const stats = useMemo(() => {
    const allItems = Object.values(data).flat() as ManagedWatchedItem[];
    if (allItems.length === 0) return null;

    const ratingsCount = {
        amei: data.amei.length,
        gostei: data.gostei.length,
        meh: data.meh.length,
        naoGostei: data.naoGostei.length,
    };

    // CORREÇÃO: Adicionamos 'as Record<MediaType, number>' para tipar o objeto inicial do reduce.
    const typeCount = allItems.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<MediaType, number>);

    // CORREÇÃO: Adicionamos 'as Record<string, number>' para tipar o objeto inicial do reduce.
    const ameiGenres = data.amei.reduce((acc, item) => {
      acc[item.genre] = (acc[item.genre] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topGenres = Object.entries(ameiGenres)
      .sort(([, a], [, b]) => Number(b) - Number(a))
      .slice(0, 5)
      .map(([genre, count]) => ({ genre, count }));

    return { totalItems: allItems.length, ratingsCount, typeCount, topGenres };
  }, [data]);

  // Tela de carregamento enquanto as estatísticas são calculadas
  if (!stats) {
    return (
        <div className="flex flex-col items-center p-4 text-center">
             <h1 className="text-4xl font-bold text-white mb-4">Ver Insights</h1>
             <div className="text-center py-16 bg-gray-800 rounded-lg w-full max-w-lg">
                <p className="text-2xl text-gray-400">Sua coleção está vazia.</p>
                <p className="text-gray-500 mt-2">Adicione itens em "Minha Coleção" para ver suas estatísticas.</p>
             </div>
        </div>
    );
  }

  const totalRatings: number = Object.values<number>(stats.ratingsCount).reduce((a, b) => a + b, 0);

  return (
    <div className="p-4 animate-fade-in">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Seus Insights</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Stat Cards */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg flex justify-around text-center flex-wrap gap-4">
                {Object.entries(stats.typeCount).map(([type, count]) => (
                    <div key={type}>
                        <span className="text-4xl font-bold text-indigo-400">{count}</span>
                        <p className="text-gray-400 mt-1">{type}s</p>
                    </div>
                ))}
                 <div>
                    <span className="text-4xl font-bold text-indigo-400">{stats.totalItems}</span>
                    <p className="text-gray-400 mt-1">Total</p>
                </div>
            </div>

            {/* Ratings Pie Chart */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-center text-white mb-4">Distribuição de Avaliações</h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <PieChart data={stats.ratingsCount} />
                    <ul className="space-y-2 text-sm">
                        {(Object.keys(stats.ratingsCount) as Rating[]).map(key => (
                            <li key={key} className="flex items-center">
                                <span style={{ backgroundColor: ratingStyles[key].color }} className="w-3 h-3 rounded-full mr-2"></span>
                                <span className="font-semibold text-gray-300">{ratingStyles[key].name}:</span>
                                <span className="ml-2 text-gray-400">{stats.ratingsCount[key]} ({(totalRatings > 0 ? (stats.ratingsCount[key] / totalRatings * 100) : 0).toFixed(0)}%)</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Top Genres Bar Chart */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg md:col-span-2">
                 <h2 className="text-xl font-bold text-center text-white mb-6">Top 5 Gêneros que Você Amou</h2>
                 <BarChart data={stats.topGenres} />
            </div>

        </div>
    </div>
  );
};

export default StatsView;
