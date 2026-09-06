export function handle({event,resolve}) {
  const locale=event.params.lang==='ko'?'ko':'en';
  return resolve(event,{transformPageChunk:({html})=>html.replace(/<html lang="(?:ko|en)"/,`<html lang="${locale}"`)});
}
