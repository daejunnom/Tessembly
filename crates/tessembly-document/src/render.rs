use crate::{value, Document, NamedPredicate, Value};
use std::collections::BTreeSet;
use tessembly_core::{Error, Result, MAX_INPUT, PROFILE};

pub(crate) fn text(doc: &Document) -> Result<String> {
    doc.validate()?;
    if !doc.optional_extensions.is_empty() {
        return Err(Error::new("OPAQUE_METADATA_WOULD_BE_LOST"));
    }
    let mut text = format!("tessembly {};\n", value::quote(PROFILE));
    if !doc.config.is_empty() {
        text.push_str("config {\n");
        for (key, v) in &doc.config {
            text.push_str(&format!("    {key} = {};\n", value::display(v)?));
        }
        text.push_str("}\n");
    }
    text.push_str(&format!(
        "supply({});\n",
        value::display(
            doc.source
                .as_ref()
                .ok_or_else(|| Error::new("SUPPLY_REQUIRED"))?
        )?
    ));
    for (name, ps) in [("draw", &doc.draw), ("use", &doc.use_order)] {
        if ps.is_empty() {
            continue;
        }
        let mut xs = Vec::new();
        for p in ps {
            xs.push(match p {
                NamedPredicate::Present(a) => format!("present({})", value::quote(a)),
                NamedPredicate::Before(a, b) => {
                    format!("before({}, {})", value::quote(a), value::quote(b))
                }
                NamedPredicate::Filter(f) => {
                    tessembly_text::filter::render(f, true, &|s| value::quote(s))
                }
            });
        }
        text.push_str(&format!("{name}({});\n", xs.join(", ")));
    }
    for c in doc.references.iter().chain(&doc.decisions) {
        text.push_str(&value::display(&Value::Call(c.clone()))?);
        text.push_str(";\n");
    }
    if text.len() > MAX_INPUT {
        return Err(Error::new("INPUT_LIMIT"));
    }
    Ok(text)
}
/// Interpretation requirements. Presence here does not imply execution by Tessembly.
pub(crate) fn requirements(doc: &Document) -> Result<Vec<String>> {
    doc.validate()?;
    let mut out = BTreeSet::new();
    fn visit(v: &Value, out: &mut BTreeSet<String>) {
        match v {
            Value::Call(c) => {
                out.insert(format!("declaration.{}", c.name));
                if c.named.contains_key("weights") {
                    out.insert("measure.weighted-tokens".into());
                }
                if c.name == "external" {
                    out.insert("host.external-provider".into());
                }
                for v in c.args.iter().chain(c.named.values()) {
                    visit(v, out);
                }
            }
            Value::List(xs) => {
                for x in xs {
                    visit(x, out);
                }
            }
            Value::Pattern(n) => {
                out.insert("pattern.rfc3".into());
                fn filters(n: &tessembly_core::Node, out: &mut BTreeSet<String>) {
                    for ps in [&n.constraints.draw, &n.constraints.use_order]
                        .into_iter()
                        .flatten()
                    {
                        for p in ps {
                            if let tessembly_core::PredicateKind::Filter(f) = &p.kind {
                                f.capabilities(out);
                            }
                        }
                    }
                    match &n.kind {
                        tessembly_core::NodeKind::Concat(xs)
                        | tessembly_core::NodeKind::Union(xs) => {
                            for x in xs {
                                filters(x, out);
                            }
                        }
                        tessembly_core::NodeKind::Scope(n) => filters(n, out),
                        _ => {}
                    }
                }
                filters(n, out);
                if n.contains_use() {
                    out.insert("relations.use".into());
                }
            }
            _ => {}
        }
    }
    for v in doc.config.values().chain(doc.source.iter()) {
        visit(v, &mut out);
    }
    if doc.config.contains_key("registry") {
        out.insert("pieces.custom-ids".into());
    }
    for p in doc.draw.iter().chain(&doc.use_order) {
        if let NamedPredicate::Filter(f) = p {
            f.capabilities(&mut out);
        }
    }
    if !doc.draw.is_empty() {
        out.insert("relations.draw".into());
    }
    if !doc.use_order.is_empty() {
        out.insert("relations.use".into());
    }
    if !doc.decisions.is_empty() {
        out.insert("host.observation-policy".into());
    }
    if !doc.references.is_empty() {
        out.insert("host.reference-resolution".into());
    }
    Ok(out.into_iter().collect())
}
