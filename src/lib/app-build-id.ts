/** Build identifier baked in at compile time; changes on each deploy/build. */
export const APP_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'development';
