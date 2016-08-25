import {
    ref as $ref,
    pathValue as $value,
    pathInvalidation as $invalidate
} from 'reaxtor-falcor-json-graph';
import Color from 'color';
import { getHandler,
         setHandler,
         mapObjectsToAtoms,
         captureErrorStacks } from 'viz-shared/routes';

export function views(path, view) {
    return function views({ loadViewsById }) {

        const getValues = getHandler(path, loadViewsById);
        const setValues = setHandler(path, loadViewsById);
        const setColors = setHandler(path, loadViewsById, (color, path, context) => {

            color = new Color(color);
            const { view } = context;
            const { nBody, scene } = view;
            const type = path[path.length - 2];

            if (type === 'background' && scene) {
                scene.options.clearColor = [color.rgbaArray().map((x, i) =>
                    i === 3 ? x : x / 255
                )];
            } else if (type === 'foreground' && nBody) {
                nBody.simulator.setColor({ rgb: {
                    r: color.red(), g: color.green(),
                    b: color.blue(), a: color.alpha()
                }});
                nBody.interactions.next({ play: true, layout: true });
            }
            return color.hsv();
        }, { valueKey: 'color' });

        return [{
            get: getValues,
            route: `${view}['id', 'title']`,
            returns: `String`
        }, {
            get: getValues,
            set: setValues,
            route: `${view}.panels['left', 'right', 'bottom']`,
            returns: `Reference`
        }, {
            get: getValues,
            set: setColors,
            route: `${view}['background', 'foreground'].color`,
            returns: `Color<hsv>`
        }];
    }
}

/*
        function setPanels(json) {
            console.log(`setting panels ${JSON.stringify(json)}`);
            const { viewIds, workbookIds } = getIDsFromJSON(json);
            const { request: { query: options = {}}} = this;
            return loadViewsById({
                workbookIds, viewIds, options
            })
            .mergeMap(({ workbook, view }) => {
                const values = [];
                const viewJSON = json
                    .workbooksById[workbook.id]
                    .viewsById[view.id];
                for (const panel in viewJSON.panels) {
                    values.push($value(`
                        workbooksById['${workbook.id}']
                            .viewsById['${view.id}']
                            .panels['${panel}']`,
                        view.panels[panel] = viewJSON.panels[panel]
                    ));
                }
                return values;
            });
        }

        function setViewColorsHandler(json) {

            const { viewIds, workbookIds } = getIDsFromJSON(json);
            const { request: { query: options = {}}} = this;

            return loadViewsById({
                workbookIds, viewIds, options
            })
            .mergeMap(({ workbook, view }) => {

                const values = [];
                const { nBody, scene } = view;
                const viewJSON = json
                    .workbooksById[workbook.id]
                    .viewsById[view.id];

                for (const colorType in viewJSON) {

                    const color = view[colorType].color =
                        new Color(viewJSON[colorType].color);

                    values.push($value(`
                        workbooksById['${workbook.id}']
                            .viewsById['${view.id}']
                            ['${colorType}'].color`,
                        color.hsv()
                    ));

                    if (colorType === 'background') {
                        scene.options.clearColor = [color.rgbaArray().map((x, i) =>
                            i === 3 ? x : x / 255
                        )];
                    } else if (nBody) {
                        nBody.simulator.setColor({ rgb: {
                            r: color.red(), g: color.green(),
                            b: color.blue(), a: color.alpha()
                        }});
                        nBody.interactions.next({ play: true, layout: true });
                    }
                }

                return values;
            })
            .map(mapObjectsToAtoms)
            .catch(captureErrorStacks);
        }
*/