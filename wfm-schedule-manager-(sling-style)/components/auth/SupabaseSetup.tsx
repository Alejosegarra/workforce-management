
import React from 'react';

const SupabaseSetup: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <div className="max-w-3xl w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-4 border-red-500">
                <h1 className="text-3xl font-extrabold text-red-600 dark:text-red-400 mb-4 text-center">
                    ¡Configuración de Supabase Requerida!
                </h1>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 text-center">
                    La aplicación no puede iniciarse porque no se ha conectado a una base de datos de Supabase.
                </p>
                <div className="text-left bg-gray-50 dark:bg-gray-700 p-6 rounded-lg border dark:border-gray-600">
                    <h2 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-100">Pasos a seguir:</h2>
                    <ol className="list-decimal list-inside space-y-3 text-gray-600 dark:text-gray-400">
                        <li>
                            Abra el archivo <code className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-md font-mono text-sm">services/supabase.ts</code> en su editor de código.
                        </li>
                        <li>
                            Dentro de ese archivo, encontrará dos constantes que debe modificar:
                            <div className="my-2 p-3 bg-gray-200 dark:bg-gray-800 rounded-md">
                                <code className="font-mono text-sm text-gray-800 dark:text-gray-200">
                                    const supabaseUrl = 'YOUR_SUPABASE_URL';<br/>
                                    const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
                                </code>
                            </div>
                        </li>
                        <li>
                            Reemplace los valores de ejemplo con su <strong>URL</strong> y su clave de API <strong>anon public</strong> de su proyecto de Supabase.
                        </li>
                        <li>
                            Puede encontrar estas credenciales en su panel de Supabase, en la sección <strong className="text-gray-700 dark:text-gray-200">Project Settings &gt; API</strong>.
                        </li>
                    </ol>
                </div>
                <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                    Una vez que guarde los cambios en el archivo, la aplicación se conectará y funcionará correctamente.
                </p>
            </div>
        </div>
    );
};

export default SupabaseSetup;
